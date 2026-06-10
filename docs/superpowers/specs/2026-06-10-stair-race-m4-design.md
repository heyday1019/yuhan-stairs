# 유한의 계단 레이스 — M4 (리더보드 + 이모티콘) 설계 문서

- **작성일**: 2026-06-10
- **상위 spec**: [`2026-05-13-stair-race-design.md`](./2026-05-13-stair-race-design.md)
- **선행 마일스톤**: M3 (아이템 + 콤보 폴리시) — 2026-05-22 코드 완료, Phase 8 QA 진행 중
- **상태**: 초안 (사용자 검토 대기)

---

## 1. 목표 / 비목표

### 1.1 목표

- **리더보드** — 누적 점수 기준 주간/전체 랭킹. 홈 화면 미니 위젯 + `/leaderboard` 전체 페이지.
- **이모티콘 + 추월 알림** — 게임 중 랜덤 이모티콘 1탭 발송, 5층 격차 추월 토스트.

### 1.2 비목표 (이번 spec 범위 외)

- 마리오 카트 스타일 아이템 박스 (아이템 시스템 전면 교체) → M5+
- 상대방 실제 캐릭터 표시 → M5+
- ELO 레이팅 / 티어 시스템
- 일일/미션 보상, 광고 보상
- 친구 초대 / 푸시 알림
- 이모티콘 선택 UI (랜덤 발송으로 확정)

---

## 2. 결정 사항 요약

| 영역 | 결정 |
|---|---|
| 리더보드 메트릭 | `match_participants.final_score` 누적 합산 |
| 기간 필터 | 주간(최근 7일) + 전체 탭 |
| 표시 범위 | Top 10 + 내 순위 하단 sticky (10위 밖일 때만) |
| 리더보드 진입 | 홈 화면 미니 위젯(1~3위) + "전체 보기" 링크 |
| 이모티콘 발동 | 버튼 1개, 탭 = 랜덤 5종 중 1개 자동 발송 |
| 이모티콘 쿨다운 | 5초, Redis TTL rate limit + 클라이언트 버튼 비활성화 |
| 추월 감지 | 클라이언트 전용. `|myFloor - opponentFloor|` 가 5 미만 → 5 이상으로 벌어질 때 1회 |
| DB 변경 | 없음 (기존 테이블 집계) |

---

## 3. 리더보드

### 3.1 집계 쿼리

```sql
-- 전체 기간
SELECT
  u.id,
  u.nickname,
  SUM(mp.final_score) AS total_score
FROM match_participants mp
JOIN matches m ON mp.match_id = m.id
JOIN users u ON mp.user_id = u.id
WHERE m.status = 'ended'
  AND m.flagged = false
  AND m.match_type = 'ranked'
  AND mp.user_id IS NOT NULL
GROUP BY u.id, u.nickname
ORDER BY total_score DESC, u.nickname ASC   -- 동점 tiebreak: nickname 알파벳 순
LIMIT 10;

-- 주간: WHERE 에 AND m.ended_at > NOW() - INTERVAL '7 days' 추가
```

- `flagged=true` 매치 제외 (부정행위 방지)
- `match_type='bot'` 제외 (봇 매치는 랭킹 반영 안 함)
- `mp.user_id IS NOT NULL` — 봇 참여자 행 제외

### 3.2 API

**`GET /api/leaderboard?tab=all|weekly&limit=10`**

- `tab` 기본값: `all`
- `limit` 기본값: 10, 최대 20
- 응답:
  ```ts
  {
    entries: { rank: number; userId: string; nickname: string; totalScore: number }[];
    myEntry: { rank: number; totalScore: number } | null;
  }
  ```
- `myEntry`: 요청자의 전체 순위 계산 (서브쿼리로 rank 산출). 10위 안에 있으면 `null` 반환 (중복 표시 방지).
- 인증: 기존 `apiFetch` 쿠키 세션. 비로그인 시 `myEntry: null`.
- 캐싱 없음 (`force-dynamic`).

### 3.3 `/leaderboard` 페이지

```
┌──────────────────────────────┐
│  🏆 랭킹                      │
│  [주간] [전체]                 │
├──────────────────────────────┤
│  1위  닉네임A       12,340점  │
│  2위  닉네임B        9,870점  │
│  3위  닉네임C        8,100점  │
│  ...                          │
│  10위 닉네임J        1,200점  │
├──────────────────────────────┤
│  (sticky) 나 · 15위 · 800점  │  ← 10위 밖일 때만
└──────────────────────────────┘
```

- SSR (`export const dynamic = 'force-dynamic'`)
- 탭 전환: URL 쿼리 파라미터 `?tab=weekly|all` (router.push)
- 1~3위 아이콘: 🥇🥈🥉

### 3.4 홈 미니 위젯 (`<LeaderboardMini>`)

- 전체 기간 기준 상위 3명만 (닉네임 + 점수)
- 클라이언트 사이드 fetch (`/api/leaderboard?limit=3`)
- 로딩 중: 스켈레톤 3줄
- "전체 보기 →" → `/leaderboard`
- 홈 `<main>` 하단에 배치 (코인 표시 아래)

---

## 4. 이모티콘 + 추월 알림

### 4.1 이모티콘 목록 (클라이언트 고정)

```ts
const EMOJIS = ['😂', '😤', '🔥', '👏', '😱'] as const;
```

서버 저장 없음. 랜덤 선택은 클라이언트에서 `EMOJIS[Math.floor(Math.random() * EMOJIS.length)]`.

### 4.2 발동 흐름

```
사용자 탭
  → 쿨다운 중이면 무시
  → 클라이언트: 랜덤 이모티콘 선택
  → POST /api/matches/[id]/emoji { emoji }
  → 서버: 참여자 확인 + Redis 쿨다운 체크 + Pusher broadcast
  → 양쪽 화면: floating 이모티콘 2초 애니메이션
  → 클라이언트: 5초 쿨다운 타이머 시작 (버튼 비활성화 + 카운트다운)
```

### 4.3 `<EmojiButton>` 컴포넌트

- 위치: `fixed top-16 right-3 z-40`
- 평상시: 😊 아이콘 버튼 (40×40px)
- 쿨다운 중: 버튼 비활성화 + "3s" 카운트다운 텍스트 (1초마다 갱신)
- 수신 이모티콘 표시: 화면 중앙 상단에 크게 나타났다 2초 후 fade-out (`@keyframes emoji-float`)

### 4.4 API `POST /api/matches/[id]/emoji`

- body: `{ emoji: string }`
- 검증:
  1. 요청자가 해당 매치 participant인지 (Redis `match:state` 또는 DB)
  2. Redis `match:emoji_cooldown:{matchId}:{userId}` 존재 시 429
  3. SET `match:emoji_cooldown:{matchId}:{userId}` TTL 5s
- Pusher: `emoji_sent { userId, emoji }` → 기존 `presence-match-{matchId}` 채널
- 응답: `{ ok: true }` (fire-and-forget — 실패해도 게임 진행 무관)

### 4.5 추월 알림 (클라이언트 전용)

서버 이벤트 없음. `useEffect`에서 감지:

```ts
const prevGapRef = useRef(0);

useEffect(() => {
  const gap = myFloor - opponentFloor;
  const prev = prevGapRef.current;
  // 5 미만 → 5 이상으로 전환할 때만 발동
  if (Math.abs(prev) < 5 && Math.abs(gap) >= 5) {
    if (gap > 0) showToast('🎉 +5층 앞서고 있어요!');
    else         showToast('😱 상대가 5층 앞서갑니다!');
  }
  prevGapRef.current = gap;
}, [myFloor, opponentFloor]);
```

- 같은 방향으로 격차가 계속 벌어져도 재발동 없음 (5→10층 등)
- 격차가 다시 5 미만으로 좁혀졌다가 다시 5 이상 벌어지면 재발동 (정상)

---

## 5. 파일 변경 목록

### 5.1 신규 파일

```
src/server/leaderboard.ts               getLeaderboard(tab, limit, myUserId)
src/app/api/leaderboard/route.ts        GET /api/leaderboard
src/app/api/matches/[id]/emoji/route.ts POST /api/matches/[id]/emoji
src/app/leaderboard/page.tsx            전체 리더보드 페이지
src/components/LeaderboardMini.tsx      홈 미니 위젯
src/components/EmojiButton.tsx          게임 화면 이모티콘 버튼
```

### 5.2 수정 파일

```
src/app/page.tsx                        LeaderboardMini 하단 추가
src/app/game/[matchId]/page.tsx         EmojiButton + 추월 감지 useEffect
src/game/sync/network-adapter.ts        emoji_sent 이벤트 핸들러 추가
```

### 5.3 DB / 인프라 변경

- **DB 변경 없음** — 신규 마이그레이션 불필요
- **Redis 키 추가** — `match:emoji_cooldown:{matchId}:{userId}` (TTL 5s)
- **Vercel 환경변수 변경 없음**

---

## 6. 테스트 전략

### 6.1 vitest 단위 테스트

**`tests/server/leaderboard.test.ts`**
- 매치 0개 유저 → 리더보드 미포함
- `flagged=true` 매치 → 점수 집계 제외
- `match_type='bot'` 매치 → 집계 제외
- 8일 전 매치 → 주간 필터에서 제외, 6일 전 → 포함
- 동점 유저 → nickname 알파벳 순 tiebreak
- 내 순위 10위 밖 → `myEntry` 반환, 10위 안 → `null`

**`tests/server/emoji.test.ts`**
- 매치 참여자 아닌 userId → 403
- 5초 내 연속 요청 → 429
- 정상 요청 → Pusher trigger 1회 호출 확인

### 6.2 수동 QA 체크리스트

- [ ] 홈 화면 하단 미니 위젯 — 닉네임 + 누적 점수 상위 3명 표시
- [ ] "전체 보기" → `/leaderboard` 진입
- [ ] 주간 / 전체 탭 전환 — URL 파라미터 반영
- [ ] 10위 밖 유저 → 하단 sticky에 내 순위 표시
- [ ] 10위 안 유저 → sticky 없음
- [ ] 게임 화면 우상단 이모티콘 버튼 표시
- [ ] 탭 → 랜덤 이모티콘 floating 애니메이션 (양쪽 화면)
- [ ] 5초 내 재탭 → 버튼 비활성 + 카운트다운
- [ ] 5초 후 버튼 재활성
- [ ] 격차 5층 이상 벌어질 때 추월 토스트 1회 발동
- [ ] 격차 유지 중 재발동 없음
- [ ] 격차 5 미만으로 좁혀진 후 다시 5 이상 → 재발동

---

## 7. 미해결 사항

1. **리더보드 bot 매치 포함 여부** — 현재 `match_type='ranked'`만 집계. 향후 봇 매치도 포함할지는 유저 피드백 후 결정.
2. **이모티콘 수신 위치** — 현재 화면 중앙 상단 고정. 상대 캐릭터 근처에 표시하는 게 더 자연스러울 수 있음 — Pixi 통합 필요, M5+.
3. **리더보드 캐싱** — 현재 캐시 없음. 유저 100명 이상이 되면 1분 Redis 캐시 도입 고려.
