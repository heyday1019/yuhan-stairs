# 유한의 계단 레이스 — M2 (멀티플레이 코어) 설계 문서

- **작성일**: 2026-05-15
- **상위 spec**: [`2026-05-13-stair-race-design.md`](./2026-05-13-stair-race-design.md)
- **선행 마일스톤**: M1 (싱글 + AI 봇, 100층) — 2026-05-14 완료
- **상태**: 초안 (사용자 검토 대기)

---

## 1. 목표 / 비목표

### 1.1 목표

- 두 사람이 같은 시드의 100층 계단을 동시에 올라 누가 먼저 정상에 도달하는지 겨루는 **랭킹 매칭**을 동작시킨다.
- 매칭 큐 + Pusher 채널 + 서버 권위 동기화 + 부정 검증 상한선 + 끊김 처리 + 봇 fallback 까지 1패스로 완성한다.

### 1.2 비목표 (이번 spec 범위 외)

- 친구 초대 / 딥링크 / `/join/[token]`
- 200/300/500/800 모드 (M2는 100층만)
- 상점, 일일 미션, 이모티콘, 추월 알림
- Toss SDK 실 연동 (device_id로 임시)
- 아이템 메커니즘 (bomb / mine / beanstalk — 시드만 있고 효과 0%)
- E2E (Playwright 두 브라우저 시나리오) — 후속 spec

---

## 2. 결정 사항 요약

| 영역 | 결정 |
|---|---|
| 유저 식별 | 익명 device_id (UUID, localStorage) + 닉네임 1회 입력. `users.toss_user_id` 컬럼 재활용 |
| 매칭 큐 | Upstash Redis ZSET, atomic ZADD + ZRANGE/ZREM 페어링 |
| 봇 fallback | 10초 자동 + "봇과 시작" 즉시 종료 버튼 |
| 채널 토폴로지 | `presence-match-{matchId}` + `private-user-{userId}` |
| 시작 동기 | 서버 주도 3초 카운트다운 (presence webhook 트리거) |
| 동기화 경로 | 서버 경유 전체 (POST tick → 검증 → Pusher trigger) |
| Tick 주기 | 200ms + 의미 이벤트 즉시 |
| 부정 검증 | 상한선 (1층당 ≥90ms) + 단조성 + 시드 일관성. flag 3회 누적 시 무효화 |
| 끊김 처리 | webhook이 끊김 키만 SET, **다음 정상 tick 도착 시 자연스럽게 timeout 검출**. 10초 grace |
| 모드 | 100층만 |

---

## 3. 인증 & 유저

### 3.1 device_id 발급

- 클라이언트 첫 진입 시 `localStorage["device_id"]` 부재면 `crypto.randomUUID()`.
- 닉네임이 미설정이면 `/` 페이지에 `<NicknameModal>` 강제 노출. 입력 → `POST /api/users/register { deviceId, nickname }`.
- 모든 API 요청은 `x-device-id` 헤더 동봉. 서버 미들웨어가 헤더로 user 조회 후 컨텍스트 주입. 미등록 device는 `users` 테이블에 onthe-fly 생성.

### 3.2 서버 변경

- `src/server/auth.ts`의 `getOrCreateCurrentUser()` — `getStubTossUser()` 제거하고 `getCurrentUserFromHeaders(headers)`로 교체. `users.toss_user_id` 컬럼은 그대로 두고 device_id 값을 저장 (M3에서 진짜 Toss ID로 마이그레이션 시 `device:{uuid}` → `toss:{tossUserId}` 매핑 테이블 추가 예정).
- `src/lib/toss-sdk-stub.ts` 는 삭제.

---

## 4. 매칭 큐

### 4.1 Redis 키

| 키 | 타입 | TTL | 용도 |
|---|---|---|---|
| `queue:ranked:100` | ZSET (score=joinedAtMs, member=userId) | — | 매칭 대기 큐 |
| `match:lookup:{userId}` | STRING (matchId) | 60s | 활성 매치 매핑 (중복 enqueue 방지) |
| `match:state:{matchId}:{userId}` | HASH (seq, floor, ts) | 90s | 마지막 검증된 tick |
| `match:disconnect:{matchId}:{userId}` | STRING (disconnectedAtMs) | 12s | grace 윈도우 |
| `match:start:{matchId}` | STRING (startAtMs) | 30s | 카운트다운 동기화 |

### 4.2 enqueue 흐름 — `POST /api/matchmaking/enqueue { mode: 100 }`

1. 미들웨어로 user 확인.
2. `match:lookup:{userId}` 조회. 있으면 그 matchId 반환 후 종료 (재진입 처리).
3. 큐 청소: `ZREMRANGEBYSCORE queue:ranked:100 -inf {now-30s}`.
4. `ZADD queue:ranked:100 {now} {userId}`.
5. `ZRANGE queue:ranked:100 0 1 WITHSCORES` 으로 두 명 후보 확인. 둘 다 있으면 `ZREM` 둘 다 시도. **둘 다 ZREM=1 이어야 페어 확정** (race 방지).
6. 페어 확정 시:
   - `matches` INSERT (`status='pending'`, `match_type='ranked'`, `stair_seed=randomUUID()`, `mode=100`).
   - `match_participants` 두 행 INSERT.
   - 양쪽 `match:lookup:{userId}`에 matchId SET TTL 60s.
   - 양쪽 `private-user-{userId}` 채널로 `match_ready { matchId, opponentNickname, role: 'A'|'B' }` push.
   - 응답 `{ status: 'paired', matchId }`.
7. 페어 미확정 시 응답 `{ status: 'queued' }`. 클라이언트는 자기 `private-user-{userId}` 구독 상태로 `match_ready` 대기.

### 4.3 cancel — `POST /api/matchmaking/cancel`

- `ZREM queue:ranked:100 {userId}`.
- 응답 `{ ok: true }`. 이미 페어된 후 호출되면 무시 (matchId 반환).

### 4.4 봇 fallback

- 클라이언트가 `match_ready` 안 받고 10초 경과 → 자동으로 cancel 호출 → `POST /api/matches/bot` (M1 기존 경로).
- 사용자가 "봇과 지금 시작" 버튼 → 동일 시퀀스 즉시 실행.
- 봇 매치는 `match_type='bot'` 으로 기존 게임 페이지가 `bot-adapter`를 사용 (§7).

---

## 5. Pusher 채널

### 5.1 채널 일람

| 채널 | 누가 구독 | 받는 이벤트 |
|---|---|---|
| `presence-match-{matchId}` | 매치 양쪽 | `match_start`, `opponent_tick`, `opponent_disconnected`, `opponent_resumed`, `match_ended` |
| `private-user-{userId}` | 본인만 | `match_ready`, `match_cancelled` |

### 5.2 채널 인증 — `POST /api/pusher/auth`

- pusher-js 표준 핸드셰이크. body: `socket_id`, `channel_name`.
- 서버:
  - `presence-match-{matchId}`: 미들웨어로 user → `match_participants` 조인으로 매치 참가 자격 확인. 통과 시 `pusher.authorizeChannel` + `user_info: { nickname }`.
  - `private-user-{userId}`: 헤더 user.id === channel의 userId 인지 확인.
  - 실패 시 401.

### 5.3 Pusher webhook — `POST /api/pusher/webhook`

- 등록 이벤트: `member_added`, `member_removed`, `channel_occupied`.
- HMAC 서명 검증 (Pusher 헤더 `X-Pusher-Key`, `X-Pusher-Signature`).
- `channel_occupied` + 채널이 `presence-match-{id}` + `member_count===2` → §6.1 시작 트리거.
- `member_removed` → §6.4 끊김 키 SET.
- `member_added` (이미 시작된 매치에서) → §6.4 재접속 처리.

---

## 6. 인게임 흐름

### 6.1 시작 카운트다운

1. 양쪽 클라이언트가 `match_ready` 수신 → `presence-match-{matchId}` 구독.
2. 두 번째 멤버가 들어오면 Pusher가 webhook으로 `channel_occupied` (또는 `member_added` count=2) 호출.
3. 서버가 `match:start:{matchId}` 가 비어있을 때만 SET NX (race 방지) → `startAtMs = serverNowMs + 3000`.
4. 서버가 `presence-match-{matchId}` 채널로 `match_start { startAtMs, seed, mode: 100 }` trigger.
5. 같은 트랜잭션에서 서버는 `matches.status='active'`, `matches.match_started_at = to_timestamp(startAtMs / 1000)` UPDATE.
6. 클라이언트는 자체 시계 차이를 무시하고 `startAtMs - performance.now()` 만큼 대기 후 `<CountdownOverlay>` 3-2-1-GO. GO 시점에 입력 락 해제, 게임 루프 시작.

### 6.2 Tick 송신 — `POST /api/matches/{matchId}/tick`

```ts
type TickPayload = {
  seq: number;          // 단조 증가
  floor: number;
  combo: number;
  coins: number;
  failCount: number;
  lastEvent?: 'fail' | 'booster' | 'item';
  clientNowMs: number;  // RTT 측정용
};
```

- 빈도: **200ms 주기 + `lastEvent` 발생 시 즉시 한 번 더**.
- 클라이언트 큐: 진행 중 요청과 다음 200ms tick이 겹치면 다음 1회는 건너뜀 (네트워크 지연 누적 방지).

### 6.3 서버 검증

서버는 매 tick마다:

1. **참가자 확인**: 미들웨어 user.id 가 매치 참가자인지.
2. **단조성**: `seq` > 직전 seq. `floor` 가 직전 대비 [-3, +8] 범위 안. (booster +3, 일반 +1, 묶음 처리 시 ≤+8 허용)
3. **상한선**: `(serverNowMs - matchStartedAt) / 90 ≥ floor`. 위반 시 `flagged_count++`.
4. **시드 일관성**: `lastEvent` 가 `'booster'` 면 `stairs[floor-1].isBooster === true`. 위반 시 `flagged_count++`.
5. **flag 임계치**: `matches.flagged_count >= 3` → `matches.flagged=true, status='ended'`. 양쪽에 `match_ended { reason: 'invalidated' }` 푸시. 코인 정산 없음.
6. 통과 → `match:state:{matchId}:{userId}` HASH 갱신.
7. **상대 끊김 검출** (§6.4):
   - `match:disconnect:{matchId}:{opponentUserId}` 키 조회.
   - 키 없음 → 정상 진행. `opponent_tick { floor, combo, lastEvent }` trigger.
   - 키 존재 + 경과 < 10000ms → `opponent_tick` + `opponent_disconnected_grace { remainingMs }` 두 이벤트 trigger.
   - 키 존재 + 경과 ≥ 10000ms → `opponent_tick` 보내지 않고 §6.4 종료 처리로 진입.

서버는 매치당 한 번만 시드로부터 `generateStairs()` 실행하여 함수 인스턴스 메모리에 LRU 캐싱. Fluid Compute 인스턴스 재사용으로 cold path 최소화.

### 6.4 끊김 (Tick 기반 검출)

- presence webhook의 `member_removed` 도착 → `SET match:disconnect:{matchId}:{userId} {now} EX 12`.
- **검출은 다음 정상 tick 시점**에 수행 (§6.3 step 7 참조):
  - 검출 로직이 §6.3 의 tick 핸들러 내부에서 호출됨. 별도 타이머 없음.
  - 키 존재 + 경과시간 ≥ 10000ms → 매치 종료. `winner_user_id = 송신자(살아있는 유저)`, `status='ended'`. `match_ended { reason: 'opponent_disconnect', winnerUserId }` 채널로 푸시. 코인 정산: 승자 +30, 패자 +0 (정상 패배의 +5와 차등하여 의도적 끊김 억제).
- 재접속: webhook의 `member_added` 도착 → `match:disconnect:{matchId}:{userId}` 키 조회, 존재하면 DEL + 마지막 `match:state` 값을 `opponent_resumed { lastState }` 로 푸시.
- 양쪽 모두 끊겨서 더 이상 tick이 들어오지 않으면 매치는 영구 `pending`/`active` 상태로 남음. **30분 후 별도 정리 Cron**이 stale 매치를 `status='abandoned'`로 마킹 (M2 범위 안 — 단순 routes 추가).

### 6.5 종료 — `POST /api/matches/{matchId}/finish`

- 호출 조건: 클라가 `floor >= 100` 도달, 또는 `match_ended` 수신 시 result 페이지 이동 직전.
- 서버:
  1. tick 검증 재실행 (마지막 floor + 상한선).
  2. 두 클라가 동시에 finish 요청해도 race 안전: `matches.status` 가 `'active'` 일 때만 UPDATE → `'ended'` (Postgres 조건부 UPDATE).
  3. `winner_user_id` 결정: 먼저 100층 도달한 (= 먼저 finish 요청한) user.
  4. 코인 정산: spec §7.2 — 100층 모드 ranked 승자 +30, 패자 +5. `transactions` insert.
  5. `match_ended { winnerUserId, results, coinsDelta }` 양쪽 푸시.

---

## 7. 클라이언트 구조 변경

### 7.1 동기화 어댑터 추상화

`src/game/sync/` 신규:

```ts
// types.ts
export interface OpponentSyncAdapter {
  start(opts: { onOpponentTick: (floor: number) => void; onMatchEnded: (r: MatchEnded) => void }): void;
  sendTick(tick: TickPayload): void;
  stop(): void;
}

// bot-adapter.ts        — 기존 startBotLoop 을 어댑터 인터페이스로 래핑. 네트워크 호출 없음.
// network-adapter.ts    — pusher-js 채널 구독 + POST /tick 호출.
```

`src/game/loop.ts` 의 `startBotLoop` 는 `bot-adapter` 내부 구현으로 이동. `src/app/game/[matchId]/page.tsx` 가 `match_type` 에 따라 어댑터 선택.

### 7.2 store 변경

- `botFloor` → `opponentFloor` 로 명칭 변경 (의미 일반화).
- `botDifficulty` 는 `match_type='bot'` 일 때만 의미 있음. ranked 매치는 무시.
- 신규 액션: `setMatchStarting(startAtMs)`, `setOpponentDisconnectedGrace(ms)`, `applyMatchEnded(payload)`.

### 7.3 신규 컴포넌트

- `<NicknameModal>`: 첫 진입.
- `<CountdownOverlay>`: 3-2-1-GO. ranked 매치만.
- `<WaitingOpponent>`: 끊김 grace 동안 표시. "상대 재접속 대기 — N초".

---

## 8. 데이터 모델 변경

### 8.1 Postgres diff

```sql
alter table matches add column match_started_at timestamptz;
alter table matches add column flagged_count int not null default 0;
```

기존 컬럼·인덱스·제약 변경 없음.

### 8.2 신규/변경 파일

```
src/server/
  pusher.ts            (신규) Pusher 서버 SDK 래퍼: trigger, authorizeChannel, webhook 서명 검증
  redis.ts             (신규) @upstash/redis 클라이언트
  matchmaking.ts       (신규) enqueue, cancel, pair 로직
  matches.ts           (수정) ranked finish, 시드 캐시
  tick-validator.ts    (신규) 단조성/상한선/시드 일관성

src/app/api/
  pusher/auth/route.ts             (신규)
  pusher/webhook/route.ts          (신규)
  matchmaking/enqueue/route.ts     (신규)
  matchmaking/cancel/route.ts      (신규)
  matches/[id]/tick/route.ts       (신규)
  matches/[id]/finish/route.ts     (신규)
  users/register/route.ts          (신규)

src/lib/
  device-id.ts         (신규) localStorage UUID
  pusher-client.ts     (신규) pusher-js 싱글턴
  match-network.ts     (신규) tick 송신, 이벤트 수신 → store dispatch

src/game/
  store.ts             (수정) opponentFloor 일반화, 신규 액션
  loop.ts              (수정) startBotLoop를 bot-adapter 안으로 이동
  sync/types.ts        (신규)
  sync/bot-adapter.ts  (신규)
  sync/network-adapter.ts (신규)

src/components/
  NicknameModal.tsx    (신규)
  CountdownOverlay.tsx (신규)
  WaitingOpponent.tsx  (신규)

src/app/
  matching/page.tsx    (수정) enqueue + 10초 타이머 + "봇과 시작" 버튼
  game/[matchId]/page.tsx (수정) match_type 분기, 카운트다운 표시

src/lib/toss-sdk-stub.ts  (삭제)
src/server/auth.ts        (수정) header 기반 user 조회
```

---

## 9. 테스트 전략

vitest 단위 테스트:

- `tests/server/matchmaking.test.ts`
  - 빈 큐에 한 명 enqueue → `queued`
  - 같은 user 두 번 enqueue → 중복 없이 동일 응답
  - 두 user 동시 enqueue → 정확히 한 페어, 둘 다 `paired`
  - 페어된 user가 다시 enqueue → 기존 matchId 반환
  - cancel 후 다시 enqueue → 새 큐 항목
- `tests/server/tick-validator.test.ts`
  - 정상 tick 시퀀스 통과
  - seq 역행 → 거부
  - floor +9 → 거부 (상한 +8)
  - 50ms 만에 floor +1 → 상한선 위반, flag++
  - booster 이벤트인데 시드상 일반 계단 → flag++
  - flag 3회 누적 → invalidated
- `tests/server/finish.test.ts`
  - 정상 종료 → 승자 결정, transactions 행 생성
  - 두 클라 동시 finish → 둘 중 하나만 winner, 두 번째는 멱등 응답
  - 끊김 후 정상 tick → opponent_disconnect 종료, 승자 결정
- `tests/server/pusher-auth.test.ts`
  - 비참가자가 presence-match 인증 시도 → 401
  - 다른 user가 private-user 인증 시도 → 401

수동 QA 체크리스트는 §11.

---

## 10. 인프라 / 배포 체크리스트 (사용자 작업)

1. **Vercel Marketplace → Pusher Channels** 통합 추가 (Sandbox 무료). env 자동 주입 확인:
   - `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` (서버용 — Marketplace가 자동 주입)
   - `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` (클라이언트용 — Marketplace가 안 주입할 수 있음. 부재 시 위 값 그대로 Vercel UI에서 수동 추가)
2. **Vercel Marketplace → Upstash Redis** 통합 추가. env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
3. Pusher 대시보드 → **Webhook** 등록:
   - URL: `https://{프로덕션 도메인}/api/pusher/webhook`
   - 이벤트: `channel_occupied`, `member_added`, `member_removed`
4. `pnpm add pusher pusher-js @upstash/redis`
5. `vercel env pull .env.local` (CLI 미설치 시 Vercel UI에서 수동 복사 — M1 절차 동일)

---

## 11. 수동 QA 체크리스트

- [ ] 시크릿 창과 일반 창에서 각각 다른 닉네임으로 매칭 → 둘이 페어, 카운트다운 후 동시 시작
- [ ] 한쪽이 먼저 100층 도달 → 양쪽에 결과 화면, 승자/패자 코인 정산 확인
- [ ] 한쪽이 게임 중 탭 닫기 → 다른쪽 화면에 "상대 재접속 대기 — N초" → 10초 후 승리 결과 화면
- [ ] 끊긴 쪽 5초 안에 다시 열기 → 양쪽 모두 게임 재개, 마지막 floor 동기화
- [ ] 한 명만 큐 진입 후 10초 대기 → 자동으로 봇 매치 시작
- [ ] 큐 진입 직후 "봇과 시작" 버튼 → 즉시 봇 매치
- [ ] 같은 device로 두 탭 열고 enqueue → 두 번째 탭이 첫 매치를 그대로 받음
- [ ] DevTools에서 floor=999로 위조한 tick 전송 → 서버에서 거부, 매치 invalidated

---

## 12. 미해결 사항

1. Pusher 무료 Sandbox 플랜 한도(100 동시연결 / 200K msg/일)를 CBT에서 모니터링. 초과 조짐 시 유료 전환.
2. 끊김 후 재접속 시 마지막 state replay — `match:state` HASH는 마지막 tick만 가지고 있음. 입력 락 풀린 직후 floor만 동기화하면 충분한지, 아니면 짧은 backwards-scroll 애니메이션이 필요한지 CBT 검증 후 결정.
3. 동일 device가 두 매치를 빠르게 연속 플레이할 때 `match:lookup:{userId}` TTL(60s)로 충분한지 — 종료 시 명시 DEL 추가가 안전하나 race 가능성 검토 필요.
4. Pusher webhook 재시도 정책 — 동일 `member_added` 가 두 번 들어와도 `match:start:{matchId}` SET NX 로 멱등 보장되는지 단위 테스트 필요.
