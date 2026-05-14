# 유한의 계단 레이스 — 설계 문서

- **작성일**: 2026-05-13
- **플랫폼**: app-in-toss (Toss 미니앱)
- **상태**: 초안 (사용자 검토 대기)

---

## 1. 개요

`유한의 계단 레이스`는 토스 미니앱 플랫폼(app-in-toss)에서 동작하는 1:1 멀티플레이 계단 오르기 경주 게임이다. 클래식 "무한의 계단" 게임의 조작감을 계승하되, 목표 계단 수가 정해져 있고(100/200/300/500/800), 두 플레이어가 동일한 계단 시드를 공유하며 누가 먼저 정상에 도달하는지를 겨룬다.

### 1.1 핵심 가치 명제

- 빠른 한 판 (100층 모드는 약 1~2분), 친구와 점심값 내기에 적합한 분량
- 무한의 계단의 반응속도 재미 + 경쟁/소셜 요소
- 실 결제 없는 가상 재화 경제로 사행성/심사 리스크 최소화

### 1.2 비목표 (Non-goals)

- 실 결제·송금 연동 (출시 1단계에서는 가상 재화만)
- 3D 그래픽/풀스크린 시네마틱
- 길드/팀전 (1:1만)
- iOS/Android 네이티브 앱 (app-in-toss WebView로만 배포)

---

## 2. 게임 컨셉

### 2.1 모드

| 모드 | 목표 층 | 통칭 | 예상 플레이타임 |
|---|---|---|---|
| 100층 | 100 | 점심값내기 | 1~2분 |
| 200층 | 200 | — | 2~3분 |
| 300층 | 300 | — | 3~5분 |
| 500층 | 500 | — | 6~9분 |
| 800층 | 800 | 마스터 | 10~14분 |

### 2.2 계단 생성 규칙

- 계단은 `match_id`를 시드로 한 결정론적 시퀀스. 양쪽 클라이언트와 서버가 동일 시퀀스를 생성.
- 같은 방향(L/R)이 1~5칸 연속, 가중치는 2~3칸이 가장 흔함. 그 후 방향 무작위 전환.
- 코인 등장: 약 12% 확률
- 부스터 계단(혜성 계단): 약 4% (방향 전환 직후 가중치 ↑)
- 무료 아이템 픽업 계단: 약 2%

### 2.3 조작

| 입력 | 동작 |
|---|---|
| 좌측 화면 탭 | 다음 계단이 L이면 1층 상승. R이면 실패. |
| 우측 화면 탭 | 다음 계단이 R이면 1층 상승. L이면 실패. |
| 상→하 스와이프 | 현재 슬롯 아이템 즉시 사용 |
| 좌→우 / 우→좌 스와이프 | 아이템 슬롯 순환 |

### 2.4 실패 처리

- **3칸 후퇴 + 콤보 리셋**
- 0.4초 백워드 스크롤 애니메이션 (이 동안 입력 락)
- 1층 미만으로는 후퇴 불가 (바닥 캡)
- 후퇴한 계단의 코인/아이템은 이미 획득했으면 유지 (재획득 불가)
- 화면 상단 "-3" 빨간 텍스트 0.6초 팝업

### 2.5 콤보 시스템

| 콤보 | 효과 |
|---|---|
| 5 | 그라데이션 변화, 가속 1.1× |
| 10 | 캐릭터 트레일, 가속 1.25× |
| 20 | 화면 진동, 가속 1.4×, 1회 실드 (다음 한 번의 잘못된 탭이 3칸 후퇴 없이 무효 처리, 1.5초 내 사용 시) |
| 50+ | FEVER 모드, 가속 1.6×, 점수 배수 2× |

콤보 카운터는 실패 또는 1.2초 무입력 시 리셋.

### 2.6 부스터 계단 (혜성 계단)

- 빛나는 별 트레일 표시. 밟으면 2층 또는 3층 점프.
- 점프 중 입력 락 (0.4초). 점프 후 콤보 유지.

### 2.7 아이템

| 아이템 | 효과 | 상점 가격 |
|---|---|---|
| 시한폭탄 | 상대 화면에 3초 후 폭발, 1.5초간 시야 가림 | 50 코인 |
| 지뢰 | 상대의 다음 5칸 중 1칸을 지뢰로. 밟으면 1초 멈춤 | 30 코인 |
| 사다리 잭콩 | 본인 즉시 5층 상승, 콤보 유지 | 80 코인 |

게임 시작 전 슬롯당 최대 1개 장착(3종 × 1개). 매치 중 추가 구매 불가.

### 2.8 20F 통로

- 20·40·60·80·… 층 도달 시 화면 우측 상대 미니뷰 1.5× 확대, 0.5초 강조 효과
- 현재 격차(층수 차)가 헤더에 노출 (예: "+3" / "-5")
- 상대가 추월하는 순간 본인에게 푸시 알림 트리거
- 추월 직후 본인이 5종 이모티콘(응원/조롱) 중 1개를 상대에게 1회 전송 가능

### 2.9 점수 / 보상

```
최종 점수 = (도달층수 × 10) + (최고콤보 × 5) + (코인획득 × 2) − (실패횟수 × 8)
```

매치 보상은 §6 참조.

### 2.10 종료 조건

- 한쪽이 목표 층 도달 → 즉시 승리
- 양쪽 모두 모드별 타임아웃 초과 → 더 높은 층 도달자 승리, 동률 시 무승부
- 한쪽이 중도 이탈 → 30초 재접속 유예, 초과 시 패배

타임아웃 (모드별 상한):

| 모드 | 타임아웃 |
|---|---|
| 100 | 3분 |
| 200 | 5분 |
| 300 | 7분 |
| 500 | 12분 |
| 800 | 18분 |

---

## 3. 기술 스택

- **프론트엔드**: Next.js (App Router) + React
- **게임 렌더링**: PixiJS (WebGL). React 컴포넌트에 `<PixiCanvas>` 형태로 임베드
- **실시간 통신**: Pusher Channels (Vercel Marketplace 통합)
- **백엔드**: Vercel Functions (Fluid Compute, Node.js)
- **DB**: Neon Postgres (Vercel Marketplace)
- **세션/매칭 큐**: Upstash Redis (Vercel Marketplace)
- **인증**: Toss SDK 로그인 → 서버에서 `toss_user_id`로 user 매핑
- **상태 관리**: Zustand (클라이언트), 서버 truth는 Postgres + Redis
- **배포**: Vercel
- **CI**: GitHub Actions → Vercel Preview / Production
- **언어**: TypeScript

### 3.1 모듈 경계

```
apps/web/                 — Next.js 앱
  src/app/                — 페이지
  src/components/         — UI 컴포넌트
  src/game/               — PixiJS 게임 로직 (UI 분리)
    engine/               — 렌더링, 입력, 카메라
    systems/              — 콤보, 부스터, 아이템 적용
    sync/                 — Pusher 송수신 어댑터
  src/lib/                — 공통 (toss-sdk, fetcher, types)
  src/server/             — server-only 모듈 (Functions에서 import)
    matchmaking/
    matches/
    economy/

packages/shared/          — 클라/서버 공유 (계단 생성, 점수 계산, 검증)
  stair-generator.ts
  scoring.ts
  validators.ts
```

`packages/shared`가 핵심: **계단 생성과 점수 계산이 클라이언트와 서버에서 정확히 동일하게 실행**되어야 부정행위 검증이 성립.

---

## 4. 페이지 / 네비게이션

| 라우트 | 페이지 | 핵심 요소 |
|---|---|---|
| `/` | 메인 | 빠른 매칭, 친구 초대, 일일 미션 카드, 보유 코인 |
| `/mode-select` | 모드 선택 | 계단 수 탭, 캐릭터 슬라이더, BGM 미리듣기, 아이템 슬롯 |
| `/matching` | 매칭 대기 | 상대 등장 애니메이션, 5초 후 AI 봇 fallback 알림 |
| `/game/[matchId]` | 게임 | PixiJS 전체화면 + HUD 오버레이 |
| `/result/[matchId]` | 결과 | 최종 층수, 코인 정산, 리매치/공유/홈 |
| `/shop` | 상점 | 아이템·캐릭터·스킨 탭, 일일 할인 |
| `/leaderboard` | 랭킹 | 친구 / 전체 / 모드별 탭, 내 순위 고정 |
| `/me` | 마이페이지 | 통계, 보유 캐릭터, 설정 |
| `/join/[token]` | 친구 매치 입장 | 딥링크에서 진입, 매치 룸 → 게임 |

---

## 5. 데이터 모델 (Postgres)

```sql
users (
  id              uuid pk,
  toss_user_id    text unique not null,
  nickname        text not null,
  avatar_id       text,
  coins           int not null default 0,
  level           int not null default 1,
  total_xp        int not null default 0,
  created_at      timestamptz not null default now(),
  last_played_at  timestamptz
);

inventory_characters (
  user_id         uuid references users(id),
  character_id    text,
  acquired_at     timestamptz not null default now(),
  primary key (user_id, character_id)
);

inventory_items (
  user_id         uuid references users(id),
  item_id         text,                  -- 'bomb' | 'mine' | 'beanstalk'
  quantity        int not null default 0,
  primary key (user_id, item_id)
);

matches (
  id              uuid pk,
  mode            int not null,          -- 100 | 200 | 300 | 500 | 800
  stair_seed      text not null,
  match_type      text not null,         -- 'ranked' | 'friend' | 'bot'
  status          text not null,         -- 'pending' | 'active' | 'ended' | 'abandoned'
  started_at      timestamptz,
  ended_at        timestamptz,
  winner_user_id  uuid references users(id),
  flagged         bool not null default false
);
create index on matches (mode, ended_at desc);

match_participants (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references matches(id),
  user_id         uuid references users(id),          -- null = 봇 참가자
  bot_difficulty  text,                               -- null이 아니면 봇
  final_floor     int,
  final_score     int,
  max_combo       int,
  coins_earned    int,
  unique (match_id, user_id)                          -- postgres: null != null → 봇 여러 행 허용되나 M1은 봇 1명이므로 문제 없음
);
create index match_participants_user_idx on match_participants (user_id, match_id);

transactions (
  id              uuid pk,
  user_id         uuid references users(id),
  type            text not null,         -- 'match_reward' | 'shop_purchase' | 'daily_bonus' | 'ad_reward' | 'friend_invite'
  delta_coins     int not null,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);
create index on transactions (user_id, created_at desc);

leaderboards_top (                       -- 머터리얼라이즈드 뷰, 1시간 주기 리프레시
  mode            int,
  rank            int,
  user_id         uuid,
  best_score      int,
  best_floor      int,
  refreshed_at    timestamptz,
  primary key (mode, rank)
);

daily_missions (
  user_id         uuid references users(id),
  mission_date    date,
  mission_id      text,
  progress        int not null default 0,
  goal            int not null,
  claimed         bool not null default false,
  primary key (user_id, mission_date, mission_id)
);
```

---

## 6. 멀티플레이 / 네트워킹

### 6.1 Pusher 채널

| 채널 | 용도 | 권한 |
|---|---|---|
| `private-match-{matchId}` | 매치 중 양쪽 상태 동기화 | 매치 참가자만 |
| `private-user-{userId}` | 친구 초대, 매칭 결과, 이모티콘 수신 | 본인 |
| `presence-mode-{mode}` | (선택) 모드별 매칭 대기 인원 | 모든 유저 |

### 6.2 매칭 흐름

**랭킹 매칭**:
1. 유저가 `/matching` 진입 → `POST /api/matchmaking/enqueue` 호출
2. Vercel Function이 Upstash Redis 큐(`queue:ranked:{mode}`)에 `(userId, joinedAt)` push
3. 큐에서 atomic POP으로 짝 매칭 시도
4. 짝 성공: `matches` 레코드 (`status='active'`) 생성, 양쪽 `private-user-{userId}` 채널로 `match_ready` 이벤트 전송
5. 5초 타임아웃: AI 봇 매치 자동 생성, `match_type='bot'`

**친구 매칭**:
1. 호스트가 `/mode-select`에서 "친구 초대" → `POST /api/matchmaking/invite`
2. `matches` 레코드 (`status='pending'`) + 초대 토큰 생성
3. Toss SDK / 카카오톡 공유 딥링크 `app://game/join/{token}`
4. 게스트가 `/join/{token}` 진입 → 토큰 검증 후 매치 룸 입장
5. 양쪽 "준비완료" 토글 → `status='active'`로 전환

### 6.3 인게임 동기화

- 클라이언트 → 서버: 매 200ms 또는 의미 있는 이벤트(아이템 사용, 부스터 점프, 후퇴) 발생 시 즉시:
  ```ts
  type TickEvent = { floor: number; combo: number; score: number; lastEvent?: 'fail'|'boost'|'item'; ts: number; }
  ```
- 서버 검증 → 통과 시 상대 채널로 broadcast
- 서버 검증 규칙:
  - `packages/shared`의 시드 기반 계단 시퀀스로 "이 시점에 이 floor가 가능한가?" 확인
  - 1초당 최대 N칸 (콤보 단계별 차등)
  - 아이템 사용은 `inventory_items` 잔량 확인 후 차감

### 6.4 결과 확정

- 양쪽 클라이언트가 `ended` 보고 + 서버가 final 검증
- 서버에서 최종 점수 재계산 (`packages/shared/scoring.ts`)
- `matches.status='ended'`, `matches.winner_user_id` 설정
- `match_participants` 레코드 업데이트
- 코인 정산 트랜잭션 생성 (§7.2)

### 6.5 AI 봇

- 난이도: `easy`(목표까지 1.5× 시간), `normal`(1.2×), `hard`(1.0×, 95% 정확도)
- 봇과의 매치는 **랭킹 점수에 미반영** (참여 코인만 지급)

---

## 7. 경제 시스템

### 7.1 코인 흐름

| 입금 (+) | 출금 (−) |
|---|---|
| 매치 보상 | 상점 아이템 구매 |
| 일일 미션 보상 | 캐릭터/스킨 잠금해제 |
| 일일 첫 매치 보너스 (+20) | |
| 친구 초대 성공 (+50, 7일 1회) | |
| 광고 시청 (+10, 일 3회 상한) | |

### 7.2 코인 보상 테이블

| 모드 | 승자 | 패자 | AI 봇 매치 (승/패) |
|---|---|---|---|
| 100 | +30 | +5 | +10 / +2 |
| 200 | +50 | +8 | +15 / +3 |
| 300 | +70 | +12 | +20 / +5 |
| 500 | +100 | +18 | +30 / +8 |
| 800 | +150 | +25 | +50 / +12 |

### 7.3 일일 미션 풀

- 매치 3회 플레이 → +20
- 친구 매치 1회 승리 → +30
- 부스터 계단 10번 밟기 → +15
- 최고 콤보 30 달성 (주간) → +25

### 7.4 광고 보상 (선택)

Toss SDK가 광고 모듈을 제공하는지 확인 필요 (Open Question). 가능하다면 일일 3회 광고 시청 +10 코인.

---

## 8. 보안 / 부정행위 방지

- 결정론적 계단 시드 → 클라이언트 조작 시 서버 검증에서 탐지
- Rate limit: 1초당 최대 N칸 (콤보 단계별 차등)
- 클라이언트 점수 신뢰하지 않음 — 서버에서 `packages/shared/scoring.ts` 재실행
- 의심 매치는 `matches.flagged=true`, 임계치 누적 시 계정 임시 정지
- 매치 중 네트워크 끊김: 30초 재접속 유예
- Pusher Private/Presence 채널 → 서버 사이드 인증 토큰 발급
- Toss SDK 로그인 토큰은 서버에서 매번 검증 후 user 매핑

---

## 9. 출시 마일스톤

```
M1 (4-6주)   싱글플레이 + 봇 매치 + 100층 모드 + 코어 게임플레이 → 내부 테스트
M2 (3-4주)   랭킹 매칭 + 친구 초대 + 모든 모드 + 상점 → CBT
M3 (2-3주)   부스터/콤보 폴리시 + 이모티콘 + 일일 미션 + 랭킹 → app-in-toss 심사 제출
M4           OBT / 출시
```

---

## 10. 미해결 / 후속 결정 사항

1. **Toss SDK 광고 모듈** 지원 여부 확인 → 결과에 따라 §7.4 결정
2. **앱 내 음악(BGM)** 라이선스 확보 또는 무료 사용 가능 트랙 결정
3. **캐릭터 아트 스타일** — 캐주얼 컬러풀 vs 미니멀 플랫 vs 픽셀 (M1 시작 전 결정)
4. **푸시 알림** — Toss SDK 푸시 권한 모델 확인 (친구 추월/매치 결과 알림용)
5. **친구 시스템** — 토스 친구 직접 연동 가능 여부 vs 별도 친구 시스템 구축
6. **봇 난이도 매핑** — 유저 레벨/최근 성적과 봇 난이도 자동 매칭 알고리즘
7. **이모티콘 디자인** — 5종 카탈로그 (응원 2 / 조롱 2 / 중립 1)
8. **실패 시 3칸 후퇴**가 100층 모드에서 너무 가혹한지 CBT에서 검증, 필요 시 모드별 차등 (예: 100층은 2칸, 800층은 3칸) 고려

---

## 부록 A. 핵심 결정 사항 요약

| 영역 | 결정 |
|---|---|
| 멀티플레이 | 혼합 (실시간 친구전 + 비동기 랭킹전 + AI 봇 fallback) |
| 스테이크 | 게임 내 가상 코인만 |
| 조작 | 좌/우 탭 + 상하 스와이프 |
| 계단 패턴 | 같은 방향 1~5칸 연속, 무작위 전환 |
| 실패 시 | 3칸 후퇴 + 콤보 리셋 |
| 추가 메커니즘 | 콤보+가속, 부스터 계단, 이모티콘+추월 알림 |
| 기술 스택 | Next.js + PixiJS + Pusher + Neon Postgres + Upstash Redis + Vercel |
| 모드 | 100/200/300/500/800 계단 |
| 아이템 | 시한폭탄·지뢰·사다리 잭콩 |
