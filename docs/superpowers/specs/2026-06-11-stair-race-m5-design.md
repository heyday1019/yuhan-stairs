# 유한의 계단 레이스 — M5 (마리오 카트 아이템 박스) 설계 문서

- **작성일**: 2026-06-11
- **상위 spec**: [`2026-05-13-stair-race-design.md`](./2026-05-13-stair-race-design.md)
- **선행 마일스톤**: M4 (리더보드 + 이모티콘) — 2026-06-10 코드 완료
- **상태**: 승인됨

---

## 1. 목표 / 비목표

### 1.1 목표

- **마리오 카트 스타일 아이템 박스** — 게임 중 `?` 박스 픽업 → 룰렛 0.7초 → 즉시 자동 발동
- **격차 기반 박스 배치** — 뒤처진 플레이어에게 박스 더 자주 등장 (역전 기회)
- **⚡ 번개 신규 아이템** — 상대 입력 2.5초 잠금 (룰렛 풀 4종)
- **상점 리모델** — 아이템 구매 → 확률 부스트 + 캐릭터 코스메틱 2탭
- **상대방 실제 캐릭터 표시** — 현재 고정 `crystal-tophat` fallback 제거

### 1.2 비목표

- 이모티콘 수신 위치 Pixi 통합
- 리더보드 Redis 캐싱
- ELO 레이팅 / 티어
- BGM 트랙 추가 (사용자 별도 작업)

---

## 2. 결정 사항 요약

| 영역 | 결정 |
|---|---|
| 아이템 획득 방식 | 게임 중 박스 픽업만 (상점 구매 폐기) |
| 박스 배치 | 격차 기반, 클라이언트 전용 계산 |
| 룰렛 UX | 0.7초 ease-out, 결과는 밟는 순간 결정 |
| 발동 타이밍 | 룰렛 확정 즉시 자동 발동 (보유 없음) |
| 룰렛 풀 | 4종: 덩굴콩·폭탄·지뢰·번개 |
| 번개 효과 | 상대 `inputLockedUntil` +2500ms |
| 상점 역할 | 확률 부스트 + 캐릭터 코스메틱 |
| DB 변경 | `user_boosts` 테이블 추가 + `users.character_id` 컬럼 추가 |
| M3 아이템 코드 | SlotPicker / ItemBar / equip·use route 삭제 |

---

## 3. 아이템 박스 시스템

### 3.1 격차 기반 박스 간격

각 클라이언트가 `opponentFloor`를 바탕으로 실시간으로 박스 등장 간격 결정.

| 상황 | 박스 간격 |
|---|---|
| 내가 앞서는 경우 | 10층마다 1개 |
| 격차 0~4층 (비슷) | 8층마다 1개 |
| 5~9층 뒤처짐 | 5층마다 1개 |
| 10층+ 뒤처짐 | 3층마다 1개 |

**계산 방식**: `playerFloor`에서 박스 간격으로 나눈 몫이 바뀔 때마다 현재 층 +1에 박스 배치. 양쪽 화면이 서로 다른 위치에 박스를 갖는 것은 의도된 동작.

**anti-cheat**: tick route에서 `box_pickup` 이벤트를 기록하되 위치 검증 없음 (획득 자체를 위조해도 아이템 사용 효과가 서버에서 검증됨).

### 3.2 룰렛 UX (`RouletteOverlay`)

```
밟는 순간 결과 결정 (랜덤)
  → RouletteOverlay 등장 (z-50, 화면 중앙)
  → 아이콘 빠르게 전환 (100ms interval → ease-out으로 감속)
  → 0.7초 후 결과 아이콘 강조 표시 (0.3초 유지)
  → 자동 발동 + 오버레이 사라짐
```

- **게임 입력은 멈추지 않음** — 룰렛 애니메이션 중 탭 계속 가능
- 오버레이 CSS: `fixed inset-0 flex items-center justify-center bg-black/40 z-50`
- 아이콘 크기: 64×64px, 활성 아이콘은 `scale-125` + 배경 하이라이트

### 3.3 룰렛 풀 (기본 확률)

| 아이템 | 이모지 | 기본 확률 | 효과 |
|---|---|---|---|
| 덩굴콩 | 🌱 | 30% | 본인 즉시 +5층 |
| 폭탄 | 💣 | 25% | 상대 시야 1.5초 가림 |
| 지뢰 | 💀 | 25% | 상대 다음 5칸 중 1칸 지뢰, 밟으면 1초 정지 |
| 번개 | ⚡ | 20% | 상대 `inputLockedUntil` +2500ms |

확률은 `Math.random()`으로 가중 샘플링. 부스트 보유 시 해당 아이템 확률 +25%p (나머지 아이템에서 균등 차감).

### 3.4 ⚡ 번개 구현

**클라이언트 → 서버**
- 기존 `tick route`의 `lastEvent` 필드에 `'lightning_use'` 추가

**서버 → 상대 클라이언트 (Pusher)**
- `lightning_triggered { targetUserId, atMs, durationMs: 2500 }` 이벤트 broadcast
- `presence-match-{matchId}` 채널 (기존 채널 재사용)

**상대 클라이언트**
- `onLightningTriggered` 콜백 → `store.applyLightning(durationMs)` → `inputLockedUntil = Date.now() + 2500`
- 화면 flash 애니메이션 (`@keyframes lightning-flash`: 흰색 → 투명, 0.3초)

**tick-validator 확장**
- `'lightning_use'` TickEvent 추가
- 검증: 해당 매치에서 박스 픽업 이후 첫 `lightning_use`인지 (중복 발동 방지, Redis TTL 3s)

---

## 4. 상점 리모델

### 4.1 카탈로그 구조

```ts
// src/shared/shop-catalog.ts (신규)
export const BOOSTS = [
  { id: 'beanstalk_up', label: '🌱 콩 부스트',  price: 50,  effect: 'beanstalk +25%', games: 3 },
  { id: 'lightning_up', label: '⚡ 번개 부스트', price: 60,  effect: 'lightning +25%', games: 3 },
  { id: 'lucky_box',    label: '🎁 럭키 박스',   price: 40,  effect: '박스 +1 (1판)',   games: 1 },
] as const;

export const COSMETICS = CHARACTERS.map((c, i) => ({
  characterId: c.id,
  label: c.label,
  price: i === 0 ? 0 : i <= 3 ? 200 : i <= 7 ? 300 : 400,
}));
// pink-beanie(0) = 무료, 1~3번 = 200코인, 4~7번 = 300코인, 8~11번 = 400코인
```

### 4.2 상점 UI (2탭)

```
┌──────────────────────────────┐
│  💰 보유 코인: 430            │
│  [부스트] [코스메틱]           │
├──────────────────────────────┤
│ 부스트 탭:                    │
│  🌱 콩 부스트   50코인  [구매] │  ← 보유 중이면 "3판 남음" 표시
│  ⚡ 번개 부스트 60코인  [구매] │
│  🎁 럭키 박스   40코인  [구매] │
├──────────────────────────────┤
│ 코스메틱 탭:                  │
│  [핑크 비니] [딸기] [당근] ... │  ← 소유 = 초록 테두리, 장착 중 = ✓
│  미소유 = 가격 표시 + [구매]   │
└──────────────────────────────┘
```

- 부스트 중복 구매 허용 (games_remaining 누적)
- 코스메틱 구매 = 즉시 `users.character_id` 업데이트 (자동 장착)
- 구매 확인 모달 + emerald 토스트 (기존 UX 유지)

### 4.3 부스트 라이프사이클

```
구매 → user_boosts row (games_remaining = N)
     ↓
게임 시작 시 → /api/users/me 에 activeBoosts 포함 → 클라이언트가 룰렛 확률 조정
     ↓
매치 종료 시 → /api/matches/[id]/end → server가 user_boosts games_remaining 1 감소
                                      → 0이면 row 삭제
```

### 4.4 API 변경

| 엔드포인트 | 변경 |
|---|---|
| `GET /api/shop/catalog` | 신규 (부스트 + 코스메틱 목록, activeBoosts 포함) |
| `POST /api/shop/buy` | 재활용 — `type: 'boost' \| 'cosmetic'`으로 분기 |
| `GET /api/users/me` | `activeBoosts`, `character_id` 추가 반환 |
| `POST /api/matches/[id]/end` | 부스트 games_remaining 차감 로직 추가 |
| `POST /api/matches/[id]/items/equip` | **삭제** |
| `POST /api/matches/[id]/items/use` | **삭제** |

---

## 5. 상대방 실제 캐릭터 표시

### 5.1 흐름

```
매치 생성 (matchmaking.ts)
  → Redis match:state에 p1CharId, p2CharId 저장
           ↓
게임 시작 (onCountdown 콜백)
  → opponentCharId 파싱
           ↓
player.ts 렌더러에 opponentCharId 전달
  → getCharacter(opponentCharId) 로 스프라이트 로드
```

### 5.2 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/server/matchmaking.ts` | match payload에 `p1CharId`, `p2CharId` 추가 (users 테이블에서 조회) |
| `src/game/sync/types.ts` | `onCountdown` 콜백에 `opponentCharId: string` 추가 |
| `src/game/sync/network-adapter.ts` | Pusher `match_countdown` 페이로드에서 `opponentCharId` 파싱 |
| `src/game/sync/bot-adapter.ts` | `onCountdown` 호출 시 `opponentCharId: OPPONENT_FALLBACK_ID` 전달 |
| `src/app/game/[matchId]/page.tsx` | `opponentCharId` state 추가, 렌더러에 전달 |

---

## 6. DB 변경

```sql
-- 1. 부스트 보관
CREATE TABLE user_boosts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boost_type      text        NOT NULL,   -- 'beanstalk_up' | 'lightning_up' | 'lucky_box'
  games_remaining int         NOT NULL CHECK (games_remaining > 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_boosts_user_id_idx ON user_boosts(user_id);

-- 2. 장착 캐릭터
ALTER TABLE users ADD COLUMN character_id text NOT NULL DEFAULT 'pink-beanie';
```

---

## 7. 파일 변경 전체 목록

### 신규
```
src/shared/shop-catalog.ts              부스트/코스메틱 카탈로그 상수
src/server/boosts.ts                    getActiveBoosts, consumeBoosts
src/components/RouletteOverlay.tsx      룰렛 애니메이션 컴포넌트
src/app/api/shop/catalog/route.ts       GET /api/shop/catalog
drizzle/migrations/…_m5.sql            user_boosts + character_id 마이그레이션
```

### 대규모 수정
```
src/game/store.ts                equippedSlots/inventory 제거, 박스·룰렛 상태 추가
src/game/sync/types.ts           TickEvent 확장, onCountdown 시그니처 변경
src/game/sync/network-adapter.ts lightning_triggered, opponentCharId 처리
src/game/sync/bot-adapter.ts     opponentCharId 전달
src/server/tick-validator.ts     item/beanstalk_use/mine_hit/shield_used 제거, lightning_use 추가
src/server/matchmaking.ts        p1CharId/p2CharId 포함
src/server/shop.ts               buyItem → buyBoost/buyCosmetic
src/app/api/shop/buy/route.ts    type 분기
src/app/api/users/me/route.ts    activeBoosts, character_id 반환
src/app/api/matches/[id]/end/route.ts  boost 차감
src/app/game/[matchId]/page.tsx  ItemBar 제거, RouletteOverlay 추가, opponentCharId
src/app/shop/page.tsx            2탭 UI 전면 교체
src/app/mode-select/page.tsx     SlotPicker 제거
src/app/matching/page.tsx        equip 호출 제거
```

### 삭제
```
src/components/ItemBar.tsx
src/components/SlotPicker.tsx
src/app/api/shop/items/route.ts             (→ catalog route로 대체)
src/app/api/matches/[id]/items/equip/route.ts
src/app/api/matches/[id]/items/use/route.ts
```

---

## 8. 테스트 전략

### 8.1 vitest 단위 테스트

**`tests/server/boosts.test.ts`**
- 부스트 구매 → `user_boosts` row 생성 확인
- games_remaining 차감 → 0이면 삭제 확인
- 확률 조정: `beanstalk_up` 보유 시 덩굴콩 30% → 55%, 나머지 균등 차감

**`tests/server/shop.test.ts` (기존 대체)**
- 코인 부족 → 구매 거부
- `type: 'cosmetic'` → `users.character_id` 업데이트 확인
- 이미 소유한 코스메틱 → 구매 거부

**`tests/game/box-spawn.test.ts`**
- 격차 0~4층: 박스 간격 8
- 격차 5~9층: 박스 간격 5
- 격차 10층+: 박스 간격 3
- 앞서는 경우: 박스 간격 10

### 8.2 수동 QA 체크리스트

- [ ] 게임 중 `?` 박스가 계단에 나타남
- [ ] 박스 밟으면 룰렛 오버레이 등장 (~0.7초)
- [ ] 룰렛 중 탭 입력 계속 동작
- [ ] 룰렛 확정 즉시 아이템 발동
- [ ] 뒤처질수록 박스 더 자주 등장 (체감)
- [ ] ⚡ 번개: 상대 화면 2.5초 입력 잠금
- [ ] 상점 2탭 (부스트 / 코스메틱) 전환
- [ ] 부스트 구매 후 games_remaining 표시
- [ ] 코스메틱 구매 후 캐릭터 변경 즉시 반영
- [ ] 상대방 실제 캐릭터 표시 (ranked 매치)
- [ ] ItemBar / SlotPicker 흔적 없음

---

## 9. 미해결 사항

1. **럭키 박스 1판 카운트 기준** — "판"을 ended 매치로 정의. bot 매치도 포함.
2. **코스메틱 중복 구매 방지** — `inventory_items`(M3) 테이블 재활용 vs 별도 `user_cosmetics` 테이블. M5 구현 시 결정.
3. **번개 중첩** — 이미 `inputLockedUntil`이 활성인 상태에서 번개 재적용 시 `max(current, now+2500)` 처리.
4. **M3 `inventory_items` 테이블** — 아이템 구매 폐기 후 잔여 데이터 있음. 스키마는 유지, 신규 insert만 막음.
