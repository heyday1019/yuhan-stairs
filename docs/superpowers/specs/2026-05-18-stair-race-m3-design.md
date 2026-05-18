# 유한의 계단 레이스 — M3 (아이템 + 콤보 폴리시 + 상점) 설계 문서

- **작성일**: 2026-05-18
- **상위 spec**: [`2026-05-13-stair-race-design.md`](./2026-05-13-stair-race-design.md)
- **선행 마일스톤**: M2 (멀티플레이 코어) — 2026-05-15 코드 완료, 2026-05-18 QA 통과
- **상태**: 초안 (사용자 검토 대기)

---

## 1. 목표 / 비목표

### 1.1 목표

- M2의 100층 멀티플레이 위에 **게임 깊이** 한 겹을 얹는다 — 아이템 3종(시한폭탄/지뢰/사다리 잭콩), 콤보·부스터 시각 폴리시, 시간 가속 체감, BGM.
- 코인 경제에 사용처를 만든다 — **소형 상점** `/shop` 라우트, 아이템 카탈로그 3종.
- 게임 진행 동안 무엇이 일어났는지 한눈에 보이는 인게임 HUD와 시각 효과 보강.

### 1.2 비목표 (이번 spec 범위 외)

- 이모티콘 5종 + 추월 알림 → M4
- Toss SDK 실 연동 (device_id 그대로 사용)
- 200/300/500/800 모드 (100층만)
- 캐릭터/스킨 슬롯, 광고 보상, 일일 미션
- 친구 초대 / `/join/[token]`
- 푸시 알림 (Toss SDK 필요)
- 리더보드 / 랭킹
- Playwright E2E

---

## 2. 결정 사항 요약

| 영역 | 결정 |
|---|---|
| 아이템 획득 | 게임 중 픽업 계단 (~2%) + `/shop` 코인 구매 (둘 다) |
| 아이템 슬롯 | 매치당 슬롯 3개 (3종 × 1), 매치 시작 전 장착, 매치 중 추가 구매 불가 |
| beanstalk 검증 | tick `lastEvent:'beanstalk_use'` + 단발 상한선 면제 (90ms/층 룰 1회 우회) |
| mine 동기화 | 서버가 위치 결정 → 양쪽 broadcast (시드 사전 변형 X) |
| bomb 동기화 | 서버 시각 + 3000ms → `bomb_triggered { atMs, durationMs:1500 }` broadcast. 게임 상태 영향 0 |
| 콤보 폴리시 | M1 §2.5 5/10/20/50 단계 CSS만으로 구현. 1회 실드 검증 추가 |
| 시간 가속 체감 | 카메라 lerp 가속 + 배경 패럴랙스 + 모션 라인 + chromatic aberration |
| BGM | 무료 라이선스 트랙 큐레이션 5개 슬롯 (main/matching/game/fever/result). WebAudio API + playbackRate 동적 변경 |
| 상점 | 별도 `/shop` 라우트, 인벤토리/카탈로그 한 페이지 |
| 부정행위 | `items_used` jsonb 누적, 슬롯 미장착 사용 / 인벤토리 0 사용 시 flag |

---

## 3. 아이템 메커니즘

### 3.1 beanstalk (사다리 잭콩) — 50 코인

- 사용 시 본인 즉시 +5층, 콤보 유지, 0.4s 점프 락 (입력 무시).
- 클라이언트가 use API 호출 → 서버가 인벤토리/슬롯 확인 → 응답 `{ ok, toFloor }`.
- 같은 tick에 `lastEvent:'beanstalk_use'` 포함된 tick 도착 시 서버는 **floor +5 한 번에 한해 상한선 면제**. 단조성/[-3, +8] 범위 룰은 그대로 (그래도 +5는 +8 안).
- 양쪽 채널에 `beanstalk_used { userId, fromFloor, toFloor }` broadcast → 본인 시각 효과 + 상대 미니뷰에 점프 표시.

### 3.2 mine (지뢰) — 30 코인

- 사용 시점에 **상대의 다음 5칸 중 1칸**이 지뢰가 된다.
- 클라가 `POST /api/matches/{id}/items/use { itemId:'mine' }` →
  1. 서버가 인벤토리/슬롯 확인.
  2. 서버가 상대의 마지막 검증된 `floor` 조회 (`match:state:{matchId}:{opponentUserId}` HASH).
  3. `targetFloor = randomInt(opponentFloor + 1, opponentFloor + 5)`.
  4. `items_used` jsonb에 append.
  5. `mine_placed { targetUserId, floor }` 양쪽 broadcast.
- 상대 클라는 그 floor를 mine으로 마킹 → stair renderer가 해골 아이콘 표시.
- 상대가 그 floor 입력 처리 시:
  - 본인 클라가 mine 체크 → 입력 락 1000ms 발동.
  - tick에 `lastEvent:'mine_hit'` 포함.
  - 서버 검증: `items_used`에 해당 mine 존재 + targetUserId 일치 + 처음 hit (중복 hit 무시).
- 콤보는 **유지** (실패와 다른 종류의 페널티).

### 3.3 bomb (시한폭탄) — 80 코인

- 사용 3초 후 상대 화면 1.5초 가림. **게임 진행에는 영향 0** (탭 입력은 그대로 받음).
- 클라가 use API → 서버가 `bomb_triggered { targetUserId, atMs: serverNow+3000, durationMs:1500 }` broadcast.
- 본인 화면에는 토스트 "폭탄 설치 — 3초 후 발동".
- 상대 클라는 `atMs - performance.now()` 대기 후 `<BombOverlay>` 표시 → 1500ms 뒤 자동 해제.
- 시각 효과만이라 서버 검증 부담 없음. 단 같은 매치에서 동일 user의 bomb 사용 빈도 ≤ 10초 1회로 rate limit (어뷰즈 방지).

### 3.4 공통 규칙

- 슬롯 3개 (인덱스 0/1/2). 매치 시작 전 장착, 슬롯당 1개. 같은 아이템 2슬롯 장착 가능.
- 사용 후 그 슬롯은 비워짐 (이번 매치에는 재사용 불가).
- 매치 중 추가 구매/장착 불가.
- 픽업 계단(약 2%) 밟으면 random 1종이 슬롯 빈 자리에 채워짐. 슬롯 full이면 픽업 무시.
- 코인 가격 (상점): bomb 80 / beanstalk 50 / mine 30. (희소도 역순)

---

## 4. 콤보·부스터 폴리시 + 시간 가속 체감 + BGM

### 4.1 콤보 단계별 시각/게임 효과

| 콤보 | 시각 | 게임 |
|---|---|---|
| 5 | 진행 바 그라디언트 amber→orange | 가속 1.1× (입력 윈도우 단축) |
| 10 | 카운터 펄스 + 골드 글로우 | 가속 1.25× |
| 20 | 카운터 shake + 빨간 글로우 + 토스트 "콤보 20!" | 가속 1.4×, **1회 실드** |
| 50+ | FEVER — 화면 가장자리 핑크/오렌지 펄스, 점수 ×2 표기 | 가속 1.6×, 점수 ×2 |

**리셋**: 실패 또는 1.2s 무입력 (M1 §2.5 동일).

### 4.2 1회 실드 검증

- 콤보 ≥ 20 진입 시 클라이언트가 `shieldArmedUntilMs = now + 1500` 설정.
- 잘못된 탭 발생 시 `shieldArmedUntilMs > now` 인지 확인 → true면 후퇴 0으로 처리하고 `shieldConsumed=true` set, 토스트 "실드!" 1회 표시.
- tick에 `lastEvent:'shield_used'` 포함. 서버는 직전 콤보가 ≥20이고 진입 시점 + 1500ms 내인지 확인 후 후퇴 0 적용.
- 콤보 리셋 시 `shieldArmedUntilMs=0`, `shieldConsumed=false`.

### 4.3 시간 가속 체감

- **카메라 lerp**: 기존 `setCameraToFloor`가 즉시 이동. M3에서는 `lerp(currentY, targetY, t)` 도입. lerp speed 계수 `t`가 콤보 단계 따라 0.15 → 0.25 → 0.4 → 0.6 (즉시에 가까워짐).
- **배경 패럴랙스**: `<ParallaxLayers>` 컴포넌트 (별/구름 PNG 3겹). 콤보 따라 1.0× → 1.6× 흘러내림 속도.
- **모션 라인** (콤보 ≥ 20): 화면 양옆에 흘러내리는 흰 그라디언트 라인 (CSS keyframe).
- **chromatic aberration** (콤보 ≥ 50): CSS filter `filter: drop-shadow(2px 0 red) drop-shadow(-2px 0 cyan)` 미세 적용.
- **모서리 펄스** (FEVER): 화면 양 가장자리 핑크/오렌지 펄스 (`@keyframes feverPulse`).

### 4.4 BGM

- **시스템**: `src/lib/audio.ts` 싱글턴.
  - `loadTracks(map: Record<string, string>)` — preload.
  - `play(slot)`, `stop(slot, { fadeMs })`, `crossfade(fromSlot, toSlot, ms)`.
  - `setPlaybackRate(slot, rate)` — 콤보 단계 변화 시 호출.
  - 사용자 mute 토글은 localStorage `audio:muted`. 게이트로 `audioContext.resume()` (Safari/iOS는 첫 사용자 제스처 필요).
- **트랙 슬롯 5종 + 후보 큐레이션** (트랙명은 **예시 검색어** — 실제 트랙은 사용자가 사이트에서 청취 후 선택):

| 슬롯 | 분위기 | BPM | 검색 키워드 (Pixabay/FMA/incompetech/FreePD) |
|---|---|---|---|
| `main_theme` | 편안한 멜로딕 lo-fi | 80~100 | "lofi study", "chill loop", "menu music" |
| `matching_loop` | 긴장감, 짧은 loop | 110~120 | "tense waiting", "anxious heartbeat", "matchmaking" |
| `game_loop` | 빠른 chiptune/synthwave | 120~140 | "8-bit arcade", "retro run", "chiptune loop" |
| `fever_loop` | 강렬 EDM/big beat | 160~180 | "energetic edm", "big beat", "hyper energetic" |
| `result_jingle` | 짧은 fanfare (2-5초) | — | "victory sting", "win jingle", "level complete" |

**후보 검색 가이드** (사용자가 직접 검색해서 트랙 1개씩 고름):

- **Pixabay Music** (https://pixabay.com/music/) — 라이선스: Pixabay Content License (상업적 사용 가능, 출처 표기 불필요. 가장 안전).
- **Free Music Archive** (https://freemusicarchive.org/) — 라이선스 트랙마다 다름. CC0 또는 CC-BY 만 사용.
- **incompetech** (https://incompetech.com/) by Kevin MacLeod — CC-BY 4.0 (출처 표기 필수).
- **FreePD** (https://freepd.com/) — Public Domain (CC0, 출처 표기 불필요).

**라이선스 적용**:
- CC-BY 트랙 사용 시 `/me` 또는 `/about` 페이지에 출처 표기 (트랙명, 작곡가, 라이선스 URL).
- M3에 `/about` 라우트 추가 (간단한 라이선스 페이지) — task에 포함.

**파일 형식**: `.mp3` 128kbps 이하 (loop 1분 분량 ~1MB). `public/audio/` 정적 서빙.

### 4.5 BGM 상태 머신

```
페이지              슬롯 재생
─────────────────────────────────
/                   main_theme
/shop               main_theme (계속)
/mode-select        main_theme (계속)
/matching           crossfade → matching_loop
/game/[id]          crossfade → game_loop
  콤보 ≥ 50         playbackRate 1.15
  콤보 < 50         playbackRate 1.0
/result/[id]        result_jingle (one-shot) → main_theme (loop)
```

playbackRate 단순 변경 vs crossfade — 후자가 자연스럽지만 두 트랙 동시 로드. 메모리 5MB 이내라 둘 다 가능. M3는 **playbackRate 단순 변경** 채택 (간단).

---

## 5. 데이터 모델 변경

### 5.1 Postgres diff

```sql
alter table matches add column items_used jsonb not null default '[]'::jsonb;
-- 형식: [{ "userId": "uuid", "itemId": "mine", "atMs": 1234567890, "floorWhenUsed": 23, "metadata": {...} }]
-- mine: metadata = { targetFloor: 25 }
-- bomb: metadata = { triggerAtMs, durationMs }
-- beanstalk: metadata = { fromFloor, toFloor }

-- 기존 inventory_items 테이블 활성화 (스키마 변경 없음)
-- 기존 transactions 테이블에 type='shop_purchase' 행 사용
```

### 5.2 Redis 키 추가

| 키 | 타입 | TTL | 용도 |
|---|---|---|---|
| `match:equipped:{matchId}:{userId}` | LIST (itemIds, 최대 3) | 90s | 매치별 장착 슬롯 (사용 시 제거) |
| `match:bomb_lastused:{matchId}:{userId}` | STRING (atMs) | 15s | bomb 10초 rate limit |

기존 `match:state:{matchId}:{userId}` HASH에 `lastInputLockUntilMs` 필드 추가 (mine hit 시 set, 다음 tick 검증에 사용).

---

## 6. API 변경

### 6.1 신규 라우트

```
POST /api/shop/buy                        — body: { itemId, qty } → 응답: { inventory, coins }
GET  /api/shop/items                      — 응답: { catalog: [{id, name, price, desc, icon}], inventory: {bomb,mine,beanstalk}, coins }
POST /api/matches/[id]/items/equip        — body: { itemIds: string[] (최대 3) } → 인벤토리 차감 + Redis equipped LIST set
POST /api/matches/[id]/items/use          — body: { itemId } → 효과 결정 + Pusher trigger + Redis equipped에서 제거
```

### 6.2 수정 라우트

- `POST /api/matches/[id]/tick` — `lastEvent`에 `'mine_hit'`, `'beanstalk_use'`, `'shield_used'` 추가. 다음 검증 추가:
  - `mine_hit`: `items_used`에 해당 mine 존재 + 처음 hit. `lastInputLockUntilMs = serverNow + 1000` set.
  - `beanstalk_use`: 직전 `items/use` 응답 받은 직후 (5초 내) tick인지 확인. floor +5 단발 상한선 면제.
  - `shield_used`: 직전 콤보 ≥20 + 진입 + 1500ms 내인지 확인. 후퇴 0 적용.
  - 기존 입력 lock 검증: `serverNow < lastInputLockUntilMs` 면 tick 거부 (mine 효과 적용 중).

### 6.3 부정행위 flag 확장

- 슬롯 미장착 아이템 사용 시도 → `flagged_count++`.
- 인벤토리 0 상태에서 buy 우회 시도 (음수 quantity 등) → 거부 + 400 응답.
- mine_hit이 같은 mine에 대해 2번 → 두 번째는 무시, flag 안 함 (네트워크 중복일 수 있음).

---

## 7. Pusher 이벤트

### 7.1 신규 이벤트 (presence-match-{matchId})

| 이벤트 | 페이로드 | 트리거 |
|---|---|---|
| `item_picked` | `{ userId, itemId, floor, slotIndex }` | 픽업 계단 tick 검증 후 |
| `mine_placed` | `{ targetUserId, floor }` | `/items/use mine` API |
| `bomb_triggered` | `{ targetUserId, atMs, durationMs }` | `/items/use bomb` API |
| `beanstalk_used` | `{ userId, fromFloor, toFloor }` | `/items/use beanstalk` API |
| `item_used` | `{ userId, itemId, floor }` | 위 3종 use API에서 공통 추가 broadcast (HUD 토스트용) |

### 7.2 빈도 예상

100층 한 판에 아이템 사용 평균 3~5회, 픽업 평균 2회 → 매치당 추가 trigger ~10개. 200ms tick (500개/판)의 ~2%. Pusher Sandbox 한도 안에서 안전.

---

## 8. 클라이언트 구조 변경

### 8.1 신규 / 변경 파일

```
src/lib/
  audio.ts                          (신규) WebAudio 싱글턴
  items-catalog.ts                  (신규) 3종 메타데이터

src/game/
  store.ts                          (수정) equippedSlots, inventory, mines[], bombActiveUntilMs,
                                            useItem 액션, applyMine, applyBomb, applyBeanstalkJump,
                                            shieldArmedUntilMs, shieldConsumed
  loop.ts                           (수정) shield 검증, mine hit lock, beanstalk 점프 락
  camera.ts                         (수정) lerp 도입, 콤보 단계 따라 lerp speed
  renderers/stair.ts                (수정) mine 표시 (해골 아이콘), 픽업 계단 (보너스 박스)
  renderers/effects.ts              (수정) beanstalkJump, fevarPulse, shieldFlash
  sync/network-adapter.ts           (수정) onItemPicked, onMinePlaced, onBombTriggered,
                                            onBeanstalkUsed 핸들러

src/app/
  page.tsx                          (수정) 메인에 "상점" + 보유 코인 + mute 토글
  mode-select/page.tsx              (수정) 장착 슬롯 미리보기 + "장착 변경" 링크 (/shop)
  shop/page.tsx                     (신규) 카탈로그 + 보유 + 슬롯 장착 UI
  about/page.tsx                    (신규) BGM 라이선스 표기
  game/[matchId]/page.tsx           (수정) ItemBar 연결, BombOverlay 표시, 콤보 lerp 가속
  api/shop/items/route.ts           (신규)
  api/shop/buy/route.ts             (신규)
  api/matches/[id]/items/equip/route.ts  (신규)
  api/matches/[id]/items/use/route.ts    (신규)

src/components/
  ShopItemCard.tsx                  (신규)
  SlotPicker.tsx                    (신규)
  ItemBar.tsx                       (신규) 인게임 HUD 좌하단
  BombOverlay.tsx                   (신규) 1.5s 반투명 검은 overlay
  MuteToggle.tsx                    (신규)
  ParallaxLayers.tsx                (신규) 별/구름 배경 패럴랙스

src/server/
  shop.ts                           (신규) buy, getCatalog, getInventory
  items.ts                          (신규) equip, use, validateUse
  tick-validator.ts                 (수정) shield/mine/beanstalk lastEvent 처리

public/audio/                        — 5개 트랙 (사용자 다운로드)
public/sprites/items/                — bomb/mine/beanstalk 아이콘 (디자인 작업 별도)
public/sprites/skull.png             — mine 표시
public/sprites/parallax/             — 별/구름 PNG 3겹
```

### 8.2 store 신규 액션

```ts
type GameState = {
  // 기존 필드 …
  equippedSlots: (string | null)[];      // 길이 3, null = 빈 슬롯
  inventory: Record<string, number>;     // { bomb: 0, mine: 0, beanstalk: 0 }
  mines: number[];                       // 본인 화면에 표시될 mine floors
  bombActiveUntilMs: number | null;
  beanstalkJumpFromFloor: number | null;
  shieldArmedUntilMs: number;
  shieldConsumed: boolean;
}

// 액션
setEquippedSlots(slots),
setInventory(inv),
useItem(slotIndex),         // → API 호출 → 응답 후 슬롯 비움
applyMine(floor),           // mine_placed 수신 시
applyBomb(atMs, dur),       // bomb_triggered 수신 시
applyBeanstalkJump(from,to), // beanstalk_used 수신 시 + 본인 floor 점프
armShield(),                // 콤보 ≥20 진입 시 자동
consumeShield(),            // 잘못 탭 무효화 시
```

---

## 9. 테스트 전략

### 9.1 vitest 단위 테스트

`tests/server/shop.test.ts`
- 잔액 부족 → 거부 (400), 인벤토리 변화 없음
- 정상 구매 → 코인 -price, 인벤토리 +qty, transactions insert
- 음수 qty / 미존재 itemId → 400

`tests/server/equip.test.ts`
- 인벤토리 부족한 itemId → 거부
- 슬롯 3개 초과 → 거부
- 이미 시작된 매치 → 거부
- 정상 → Redis `match:equipped` LIST 3개

`tests/server/items-use.test.ts`
- mine 사용 → targetFloor가 [opp+1, opp+5] 범위
- 슬롯 미장착 itemId 사용 → 거부 + flag++
- bomb 10초 내 재사용 → 거부 (rate limit)
- beanstalk → 응답 toFloor = currentFloor + 5
- 모든 use → `items_used` jsonb append, Pusher trigger 호출

`tests/server/tick-validator.test.ts` (확장)
- `beanstalk_use` lastEvent + floor +5 → 상한선 면제 통과
- `mine_hit` lastEvent → `lastInputLockUntilMs = now+1000` set
- input lock 활성 중 tick → 거부
- `shield_used` + 콤보 ≥20 + 1500ms 내 → 후퇴 0
- mine_hit 같은 mine 2번째 → 무시 (flag 안)

`tests/lib/audio.test.ts`
- play/stop/crossfade 호출 시 AudioContext 모킹으로 source 생성 확인
- mute 토글 → gain 0/1

### 9.2 수동 QA 체크리스트 (§ 11)

---

## 10. 인프라 / 배포 체크리스트 (사용자 작업)

1. **DB 마이그레이션**:
   ```sql
   alter table matches add column items_used jsonb not null default '[]'::jsonb;
   ```
   `vercel env pull .env.local` → `pnpm db:push` (drizzle-kit) 또는 Neon 콘솔에서 직접 실행.
2. **무료 BGM 트랙 다운로드 & 배치**:
   - § 4.4의 후보 트랙 표에서 슬롯당 1개씩 골라 `public/audio/` 에 정확한 파일명으로 배치.
   - 파일명: `main_theme.mp3`, `matching_loop.mp3`, `game_loop.mp3`, `fever_loop.mp3`, `result_jingle.mp3`.
   - 파일당 ≤ 1MB 권장 (loop 1분, 128kbps mp3).
   - CC-BY 트랙 선택 시 `/about` 페이지에 출처 표기 (코드에 const 배열).
3. **아이콘 PNG 배치** (사용자 디자인 작업):
   - `public/sprites/items/bomb.png`, `mine.png`, `beanstalk.png` — 64×64 권장.
   - `public/sprites/skull.png` — 32×32, mine 표시용.
   - `public/sprites/parallax/clouds.png`, `stars.png`, `mountains.png` — 좌우 타일링 가능한 형태.
   - 임시는 이모지 텍스트 (💣 💥 🌱)로 시작해도 OK, M3 끝에 PNG 교체.
4. **Vercel/Pusher/Upstash 환경변수 변경 없음**.

---

## 11. 수동 QA 체크리스트

- [ ] `/shop` 진입 → 카탈로그 3종 + 가격 + 보유 코인 표시
- [ ] 잔액 부족 시 buy 버튼 disabled
- [ ] 정상 구매 → 코인 차감 + 인벤토리 +1
- [ ] `/shop` 슬롯 3개에 인벤토리에서 드래그/탭으로 장착
- [ ] `/mode-select`에서 장착된 슬롯 미리보기 표시
- [ ] 인게임 좌하단 ItemBar에 슬롯 3개 표시
- [ ] beanstalk 탭 → 본인 +5층 점프 애니메이션, 콤보 유지, 슬롯 비워짐
- [ ] mine 탭 → 상대 화면에 mine 표시 (해골 아이콘), 본인 화면에는 토스트 "지뢰 설치"
- [ ] 상대가 mine floor 밟음 → 1초 정지 + 화면 진동, 본인 화면에는 토스트 "지뢰 적중"
- [ ] bomb 탭 → 본인 토스트 "폭탄 설치 — 3초", 3초 후 상대 화면 1.5초 어두워짐
- [ ] 픽업 계단 밟음 → 슬롯 빈 자리에 random 아이템 채워짐, 토스트 "아이템 획득"
- [ ] 슬롯 full 상태에서 픽업 → 무시 (애니메이션은 표시되지 않음)
- [ ] 콤보 5/10/20/50 단계 시각 효과 단계적 변화
- [ ] 콤보 20 진입 + 잘못 탭 1.5s 안 → "실드!" 토스트, 후퇴 0
- [ ] 콤보 50+ 진입 → FEVER 효과, 점수 ×2
- [ ] BGM 페이지 전환 시 crossfade
- [ ] 콤보 50+ 시 BGM playbackRate 1.15 (체감 가속)
- [ ] mute 토글 시 BGM/SFX 멈춤, 다음 진입 시에도 mute 유지 (localStorage)
- [ ] `/about` 페이지에 BGM 라이선스 출처 표기
- [ ] DevTools에서 슬롯 미장착 itemId로 use API 직접 호출 → 400 + 매치 invalidated
- [ ] DevTools에서 인벤토리 0 itemId로 buy → 거부
- [ ] 같은 device로 동시에 두 탭 열고 buy → 동시성 안전 (Postgres 트랜잭션)

---

## 12. 미해결 사항

1. **mine 1초 정지가 100층 모드에서 적절한지** — CBT에서 체감 검증. 1.5초로 늘릴지, 0.7초로 줄일지.
2. **bomb rate limit 10초** — 한 판 평균 80초에 8번 가능. 충분한지 / 너무 빈번한지 검증.
3. **playbackRate 변경 vs crossfade** — playbackRate 1.15는 약간 떨어지는 트랙으로 들릴 수도 있음. fever_loop를 별도 트랙으로 둘지 vs 같은 트랙 가속할지 사용자 청취 후 결정.
4. **아이콘 PNG vs 이모지** — M3 출시 시 PNG 필수인지, 이모지로 충분한지. 디자인 결정.
5. **`items_used` jsonb 크기** — 한 매치당 평균 10 entries × 100바이트 = 1KB. 100만 매치도 1GB. 인덱스 불필요. 정리 정책 (90일 이후 archive) M4에서 결정.
6. **카메라 lerp가 빠른 입력 시 시각적으로 따라가지 못하는 case** — 콤보 50에서 200ms 안에 +5층(beanstalk)이 들어오면 lerp 끝나기 전 다음 입력. test 후 lerp speed 조정 또는 즉시 이동 fallback.
7. **`/about` 라우트 외에 라이선스 표기 위치** — Toss 미니앱 심사가 출처 표기 위치(footer / settings / about)를 어떻게 요구하는지 확인 필요.
