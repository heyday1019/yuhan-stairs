# 유한의 계단 레이스 — 작업 로그

작업 디렉토리: `C:\temp\Playground\app-in-toss\game\pj1-muhan`
관련 메모리: `[[project-stair-race-current-state]]`

> **이 파일을 매일 열어서 "다음 진행할 작업"부터 읽으면 바로 이어 작업 가능.**
> 끝낸 작업은 "History"로 옮기고, 다음 작업을 명시한 채로 세션 종료.

---

## 다음 진행할 작업 (2026-05-23 이어서 시작)

**M3 Phase 0-7 코드 완료 + Phase 8 모바일 QA 진행 중**. 마지막 prod = `ee39e5a`. 어제(2026-05-22) 봇 승/패 검증에서 4개 fix 추가 push. 검증 #5(승리), #6(패배), shop/about bg는 통과. 검증 #1-4 남음.

### 0. 세션 시작 시
1. `task-log.md` 이 파일 읽기
2. `git log --oneline -10` — 마지막 커밋 `ee39e5a` 확인
3. `git status` — clean 확인
4. `pnpm test` — 111 passing 확인

### 1. 모바일 검증 — 남은 #1-4 항목 (최우선)

**모바일에서 하드 새로고침 후 순서대로**. 통과/실패 모두 보고하면 task-log 마크업.

- [ ] **#1 본인 코인 잔액** — 홈 화면 좌상단 코인 표시 확인. 0 또는 매우 낮으면 device localStorage가 매번 새 user 만드는 케이스인지 닉네임 모달 빈도로 판단. 새 가입 시 `dbbd710` 시작 보너스 500이 자동 부여돼야 함. 그래도 0이면 root cause 분석.

- [ ] **#2 상점 구매 UX** (`c315483`):
  - `/shop` 다크 배경 + 보유 코인 잘 보이는지 (어제 `ee39e5a`로 fix됨)
  - 카탈로그 3종 (🌱 잭콩 50 / 💥 지뢰 30 / 💣 폭탄 80)
  - 잔액 부족 카드 → 구매 버튼 회색 disabled
  - "구매" 탭 → 모달 `{이름} 구매 / {가격}코인을 사용합니다`
  - 모달 "구매" → 하단 emerald 토스트 `{이름} 구매 완료! -N코인` 2초
  - 보유 코인/보유 N 즉시 갱신

- [ ] **#3 게임 화면 ItemBar** (`c315483`):
  - ControlPad ◀ ▶ 좌우 양 끝
  - 가운데 하단에 **세로 3슬롯 ItemBar** + 슬롯 아래 아이템 이름 (text-[10px])
  - 첫 진입 시 튜토리얼 팝업 1회 ("슬롯을 탭하면 사용돼요")

- [ ] **#4 게임 중 코인만 픽업** (`dbbd710`):
  - stair에 `?` 박스(아이템) **없음**, 🪙 코인만 떨어짐 (booster 황금 stair는 정상)
  - 픽업한 코인은 게임 후 잔액 +N 합산되는지 확인 (이미 봇 패배 결과 +37 확인됨 → OK)

### 2. 검증 #1-4 통과 후 정리

- [x] ~~**디버그 정보 제거**~~ — `ac78ab2` 완료. cyan DEBUG 박스 + "결과 집계 실패" 헤더 제거. 상대 최종 층 라인 + `endError` state 유지.
- [x] ~~M3 spec §12 "미해결 사항" 결과로 업데이트~~ — `612e510` 완료. 기존 7개 항목 결과 기록 + 신규 발견 4개 추가.
- [ ] M4 brainstorming 가능 (마리오 카트 스타일 아이템 박스 + 상대방 실제 캐릭터 등 백로그 정리)

### 3. Phase 8 — 남은 모바일 QA 항목

어제 검증 못한 항목들 (PvP/ranked 매치 필요한 부분 위주):

#### 1단계: 상점 / 슬롯 (혼자 가능)
- [ ] `/shop` 진입 → 카탈로그 3종 (🌱 사다리 잭콩 50 / 💥 지뢰 30 / 💣 시한폭탄 80) + 보유 코인 표시
- [ ] 잔액 부족 아이템 → 구매 버튼 **회색(disabled)**
- [ ] 1개 구매 → 코인 차감 + 보유 +1
- [ ] 슬롯 3개에 인벤토리 탭으로 장착 (남은 수량 정확히 감소)
- [ ] `/mode-select`에서 "장착된 아이템" 미리보기 슬롯 3개 표시
- [ ] "장착 변경" 링크 → `/shop`으로 돌아감

#### 2단계: 게임 중 콤보 폴리시 (봇 모드로 혼자 가능)
- [ ] 모드 선택 → 매칭 → 봇 매치 (자동 봇 대전, 10초 후 또는 "봇과 지금 시작")
- [ ] 게임 화면에 **bg.png 큐브 배경** 보임 + Pixi 계단/캐릭터가 그 위에 렌더
- [ ] 좌하단 **ItemBar 슬롯 3개** 표시 (장착했다면 emoji 보이고, 봇은 use 안 됨)
- [ ] 콤보 5/10/20/50 단계에서 lerp 가속 + parallax 가속 체감
- [ ] 콤보 20 진입 + 잘못 탭 1.5s 안 → `🛡️ 실드!` 토스트, 후퇴 0
- [ ] 콤보 50+ 진입 → FEVER 모서리 펄스 (분홍색 inset 그림자)
- [ ] BGM mp3 없으니 BGM은 무음 (정상)

#### 3단계: PvP 아이템 (ranked 매치 필요)
> 봇 모드에서는 `/api/matches/[id]/items/use`가 `opp.userId` 없어서 400 반환 → 아이템 use 불가.
> **두 모바일 기기** 또는 **모바일 + 시크릿 탭(다른 닉네임)**으로 동시에 매칭하면 짝지어짐.

- [ ] 두 탭/기기로 동시에 매칭 → 같은 매치 진입
- [ ] beanstalk 탭 → 본인 즉시 +5층 점프 + 콤보 유지 + 슬롯 비워짐 + `🌱 +5!` 토스트
- [ ] mine 탭 → 상대 화면에 mine 표시 (💀 해골) + 본인 화면 슬롯 비워짐
- [ ] 상대가 mine floor 밟음 → 1초 정지 + 상대 화면 mine 사라짐
- [ ] bomb 탭 → 본인 슬롯 비워짐, 3초 후 상대 화면 1.5초 어두워짐 (게임 진행에는 영향 없음)
- [ ] 픽업 계단 (? 박스) 밟음 → 슬롯 빈 자리에 아이템 추가
- [ ] 슬롯 full에서 픽업 → 무시 (서버에서 broadcast 안 됨)

#### 4단계: 결과 화면
- [ ] 매치 한 판 후 결과 페이지에 "사용 아이템" 이력 표시 (나/상대 라벨 + emoji + 이름)
- [ ] result_jingle 무음 (mp3 없으니 정상, 파일 있으면 1회 재생)

#### 5단계: 어뷰징 방어 (선택, 시간 되면)
- [ ] DevTools에서 슬롯 미장착 itemId use API 직접 호출 → 400 + `flaggedCount++` (Neon db:studio로 확인)
- [ ] DevTools에서 인벤토리 0 itemId buy → 거부 ('not enough items' 등)

#### 6단계: BGM/`/about` (선택)
- [ ] mute 토글 → BGM/SFX 멈춤 (현재 BGM 무음이지만 localStorage 저장 확인)
- [ ] `/about` 페이지 출력 (BGM 출처 + 캐릭터 출처)

### 2. QA 통과 후 정리
- 통과 항목은 task-log에서 [x]로 체크
- 실패 항목이 있으면 fix commit → push → Vercel auto-deploy
- 모두 통과 시: M3 spec § 12 "미해결 사항"을 결과와 함께 업데이트하여 commit
- M4 brainstorming 시작 가능

### 3. 옵션 — 코인 추가 필요 시
QA 도중 코인이 또 부족하면:
```bash
node scripts/grant-coins.mjs          # 기본 500까지 top-up
# 또는
GRANT_MIN_COINS=2000 node scripts/grant-coins.mjs
```

---

## 사용자 작업 백로그 (코드 task 외)

- [x] ~~그래픽 트랙 시각 검증~~ (2026-05-19 완료)
- [x] ~~그래픽 트랙 커밋 분할~~ (2026-05-19 완료, 5 commits)
- [x] ~~원본 에셋 처리~~ (.gitignore에 추가 — 2026-05-19 완료)
- [x] ~~`pnpm db:push`~~ (2026-05-19 완료, inventory_items + items_used 적용)
- [x] ~~bg.png 적용 위치 결정~~ (2026-05-20 완료, 게임 페이지에만 적용, 워터마크 페인트오버)
- [x] ~~코인 부여~~ (2026-05-20 완료, 16명 유저 모두 500)
- [ ] **BGM 5개 트랙 다운로드 + 배치** — `public/audio/main_theme.mp3` 등 (M3 spec §4.4 검색 키워드 참조). 없어도 UI/게임 동작 정상.
- [ ] **CC-BY 트랙 사용 시 `/about` 페이지 TRACKS 배열에 항목 추가** (코드 위치: `src/app/about/page.tsx`)
- [ ] **아이템 아이콘 PNG** (선택) — 현재 이모지(💣💥🌱💀)로 동작. 나중에 `public/sprites/items/` 64×64 PNG로 교체 시 `items-catalog.ts`의 emoji 필드 보강.
- [ ] **bg.png 다른 페이지에도 적용?** — 현재는 /game만. 홈/매칭/결과에도 깔지 결정 (UI 가독성 테스트 필요).
- [ ] **Vercel 대시보드에서 Pusher 6개 env BOM 재등록** (이전 세션 미완료) — [[feedback-vercel-cli-agent-preview]] 참조
- [ ] **상대방 실제 캐릭터 표시** — 지금은 고정 `crystal-tophat` fallback. 옵션 A (Redis match payload에 character 추가) vs 옵션 B (DB users.character_id 컬럼). M4 또는 별도 마일스톤.
- [ ] **마리오 카트 스타일 아이템 박스** (사용자 제안 2026-05-21) — 현재 3슬롯 픽업/구매/장착 모델을 갈아엎고 "픽업 → 룰렛 회전 → 클릭 시 랜덤 아이템 투척" 메카닉. M4 brainstorming 으로 가져갈 것.

---

## M3 진행 상태 표

| Phase | Task | 상태 | Commit |
|---|---|---|---|
| 0 | 1 (DB schema) | ✅ | `5a4d23f` |
| 0 | 2 (items catalog) | ✅ | `1e61533` |
| 1 | 3 (shop getCatalog/getInventory) | ✅ | `a481c1f` |
| 1 | 4 (shop buyItem) | ✅ | `dcd2ab8` |
| 1 | 5 (items equipItems) | ✅ | `abf0f82` → fix `ebb60f1` |
| 1 | 6 (items useItem) | ✅ | `a5776a3` |
| 1 | 7 (tick-validator 확장) | ✅ | `1a7a2fe` |
| 2 | 8 (GET /api/shop/items) | ✅ | `1d729f1` |
| 2 | 9 (POST /api/shop/buy) | ✅ | `ebe779e` |
| 2 | 10 (POST /matches/:id/items/equip) | ✅ | `d915d9b` |
| 2 | 11 (POST /matches/:id/items/use) | ✅ | `8cd126b` |
| 2 | 12 (tick route 확장) | ✅ | `56e8067` |
| 3 | 13 (audio.ts) | ✅ | `ffee1db` |
| 3 | 14 (MuteToggle) | ✅ | `f398422` |
| 4 | 15 (store 확장) | ✅ | `5d73889` |
| 4 | 16 (network-adapter) | ✅ | `6b2a81e` |
| 5 | 17 (ShopItemCard) | ✅ | `3ff7290` |
| 5 | 18 (SlotPicker) | ✅ | `4ad13eb` |
| 5 | 19 (ItemBar) | ✅ | `4c0b3a6` |
| 5 | 20 (BombOverlay) | ✅ | `753493f` |
| 5 | 21 (ParallaxLayers) | ✅ | `ad94d36` |
| 6 | 22 (/shop page) | ✅ | `f321ecb` |
| 6 | 23 (/about page) | ✅ | `10455cc` |
| 6 | 24 (mode-select 수정) | ✅ | `59ca48e` |
| 6 | 25 (matching/game equip flow) | ✅ | `177bf04` |
| 6 | 26 (home page 정리) | ✅ | `e000f12` |
| 7 | 27 (camera lerp) | ✅ | `20cd32f` |
| 7 | 28 (stair renderer mine/pickup) | ✅ | `63fa104` |
| 7 | 29 (effects + FeverOverlay) | ✅ | `c14ba7a` |
| 7 | 30 (game 페이지 통합) | ✅ | `9ecab29` |
| 7 | 31 (result page itemsUsed) | ✅ | `146d15b` |
| + | bg.png 적용 | ✅ | `cfc94e9` |
| + | 코인 grant 스크립트 | ✅ | `19354c7` |
| 8 | 32 (수동 QA) | ⬜ | 사용자 작업 — 모바일에서 진행 |

**31/32 코드 완료 + bg.png + 코인 grant**. Phase 8 QA만 남음.

---

## 진실 소스 / 빠른 참조

- **M3 spec**: `docs/superpowers/specs/2026-05-18-stair-race-m3-design.md` (commit `b61559a`, 수정 `e1575f2`)
- **M3 plan**: `docs/superpowers/plans/2026-05-18-stair-race-m3.md` (gitignored, 32 task, 2633줄)
- **M2 spec**: `docs/superpowers/specs/2026-05-15-stair-race-m2-design.md`
- **M2 plan**: `docs/superpowers/plans/2026-05-15-stair-race-m2.md` (gitignored)
- **M1 spec**: `docs/superpowers/specs/2026-05-13-stair-race-design.md`
- **Production**: https://yuhan-stairs.vercel.app — 현재 `ee39e5a` 배포 중
- **Vercel project**: nicks-projects-eb6dc4a3/yuhan-stairs
- **GitHub repo**: https://github.com/heyday1019/yuhan-stairs

**M3 범위 (3종 아이템 + 콤보 폴리시 + 상점 + BGM)**:
- bomb (80코인, 3초 후 상대 화면 1.5초 가림, 게임 영향 0)
- mine (30코인, 상대 다음 5칸 중 1칸 지뢰, 밟으면 1초 정지)
- beanstalk (50코인, 본인 즉시 +5층, 콤보 유지)
- 상점 `/shop` 라우트 + 인벤토리 슬롯 3개
- 콤보 5/10/20/50 단계 시각 효과 강화, 카메라 lerp 가속, 배경 패럴랙스
- WebAudio BGM (main/matching/game/fever/result 5슬롯, Pixabay/FMA 등 무료 라이선스)
- 이모티콘/추월 알림은 M4로 미룸

---

## History — 2026-05-22 (Phase 8 2차 모바일 QA → 봇 결과 race + retreat anti-cheat + shop bg)

세션 주제: 봇 매치 승/패 결과를 모바일에서 검증하면서 3개 root cause를 순차 발견 → fix. 추가로 shop/about 페이지 배경 미설정 발견. 총 **4개 fix commit + 2개 doc commit** push (`a9a283a → ee39e5a`).

### 작업 흐름 (시간 순)

1. **봇 승리 시 "패배 → 승리" flip** (모바일: 100/98 won=true인데 처음에 "패배" 표시 → 시간 지나 "승리"로 바뀜)
   - Root cause: `result/[matchId]/page.tsx:58`의 `resp?.won ? '승리!' : '패배'`가 fetch 응답 도착 전 `resp === null`일 때 falsy fallback → "패배" 먼저 렌더. fetch 완료되면 "승리!"로 flip.
   - Fix: 3-state ternary `resp == null ? '집계 중...' : resp.won ? '승리!' : '패배'`. 코인 row도 동일 패턴 (`+0` 깜빡임 방지).
   - Commit: `a9a283a fix(result): show '집계 중...' while end API loading`

2. **봇 패배 시 "+undefined / won=..."** (모바일: 49/100 패배 결과에서 점수/코인/won 모두 placeholder)
   - 진단: end API가 4xx 반환 → result page가 `r.ok` 체크 없이 `setResp(errorPayload)` → `resp.totalDelta`/`resp.won` undefined. 점수는 `?? '...'` 처리됐는데 코인은 그대로 노출.
   - Root cause: 어제(`02e0b26`) validator fix는 booster+combo만 더했고 **retreat 케이스 미고려**. fail로 -3층 떨어지면 코인은 더 높은 층에서 받았지만 `stairs.slice(0, finalFloor)`만 ceiling으로 — honest run flag.
   - Fix 2개: (a) store에 `maxFloorReached` 트래킹 추가 → /end body에 포함 → validator `peakFloor = max(maxFloorReached, finalFloor)` + `maxSuccessfulTaps = peakFloor + failCount * FAIL_PENALTY_FLOORS`. (b) result page `r.ok` 분기로 `endError` 상태 분리, 헤더에 "결과 집계 실패", DEBUG에 `err=...` 추가.
   - Commit: `7818b93 fix(end-route,store,result): account for fail retreats in coin ceiling`
   - 1차 재검증 통과: 95/100 패배 / score 1204 / +37 / won=false 한 번에 렌더.

3. **봇 패배 다른 시드에서 "coins exceed available"** (모바일: 85/100 패배, err=coins exceed available)
   - 진단: validator는 fix됐는데 여전히 400. fail이 많은 시드에서 재현.
   - Root cause: `store.ts:handleTap`이 매 advance마다 `next.hasCoin`/`next.isBooster`를 더함. fail로 retreat 후 같은 stair 재climb 시 코인을 **두 번 카운트**. server validator는 stair당 1번만 합산하므로 honest run 초과.
   - Fix: store에 `lastCrossedStair: number` (init -1) 추가. handleTap에서 `s.playerFloor > s.lastCrossedStair`일 때만 hasCoin/isBooster 카운트. 콤보 보너스(`combo.combo % 5 === 0`)는 tap-per-tap이라 그대로 — retreat 후 콤보 재축적은 의도된 보상.
   - Beanstalk skipped stair는 retreat 시 `lastCrossedStair` 미업데이트 상태라 다음 climb 때 collect 가능 (의도된 trade-off).
   - Commit: `ea4d99f fix(store): stop double-collecting hasCoin/isBooster on retreat re-climb`
   - 재검증 통과: 99/100 패배 (fail 많은 케이스) / score 1234 / +37 / won=false 정상 동작.

4. **shop 페이지 흰 배경 + 흰 글자** (모바일: "상점 배경이 흰색이라 잔고가 안 보여")
   - Root cause: `globals.css`에 `--background: #ffffff` 기본값. dark mode media query 있지만 Toss webview가 light mode로 떨어지면 body 배경 그대로 흰색. 다른 페이지(home/result/mode-select/matching/game)는 main에 `bg-slate-950` 명시했으나 **shop과 about만 누락** — 흰 배경 + 흰 텍스트 = invisible.
   - Fix: 두 페이지 main className에 `min-h-dvh bg-slate-950` 추가. globals.css는 미수정 (다른 페이지 영향 없게 surgical).
   - Commit: `ee39e5a fix(shop,about): force dark bg so coin balance shows on light-mode webview`

### 주요 발견 / 결정

- **3-state ternary는 fetch-driven UI의 기본 패턴**: `resp == null ? loading : resp.cond ? a : b`. null fallback이 falsy로 떨어져 잘못된 분기로 가기 쉬움. result page에서 score는 이미 `?? '...'`로 처리했는데 타이틀/코인은 빠져있었음 — 일관된 패턴으로 통일.
- **server validator는 client store의 *모든* 코인 규칙을 1:1 미러해야 함**: 어제는 booster+combo 누락(`02e0b26`), 오늘은 retreat의 maxFloor 누락 + double-collect 버그 + failCount 헤드룸. 이번 fix로 store는 stair당 1회만 코인 부여 + server는 그에 맞춘 ceiling — 양쪽이 정확히 매칭됨.
- **`maxFloorReached` vs `lastCrossedStair`는 별도 개념**: 전자는 위치(최고 도달 층), 후자는 *횡단* 여부(coin 정산 기준). beanstalk으로 30→35 점프 시 maxFloorReached=35지만 lastCrossedStair는 이전 값 유지 — 그 사이 stair는 retreat 후 다시 collect 가능. 두 필드는 의미가 달라서 합치면 안 됨.
- **client `r.ok` 체크는 mandatory**: `.then(r => r.json()).then(setResp)`는 4xx 응답을 그대로 state에 dump해서 `undefined` 노출. 모든 fetch는 `r.ok` 분기 필수.
- **CSS `--background` light default + 다크 테마 앱**: media query `(prefers-color-scheme: dark)`는 Toss webview에서 트리거되지 않는 경우가 있음. 모든 페이지가 명시적으로 다크 bg를 깔거나 globals.css의 default를 다크로 바꾸는 게 robust — 다음 세션에 결정.

### 테스트 상태
- 4번의 fix commit 직전 `npx tsc --noEmit` 모두 exit 0.
- `pnpm test` 1회 실행 — 111 passing 유지 (기존 18 test files).

### 세션 종료 시 git 상태
- **origin/main = HEAD = `ee39e5a`** (push 완료, ahead 0)
- working tree clean (이 task-log update commit 직후)
- prod 배포: https://yuhan-stairs.vercel.app — 매 commit마다 Vercel auto-deploy
- 오늘 세션 신규 commits: **6개** (a9a283a, 7818b93, b937de7, ea4d99f, 1fae197, ee39e5a)

### 사용자 결정 사항
1. 배포 방식 동일: 매 fix 즉시 main push (어제 패턴 유지).
2. shop/about bg fix는 페이지별 surgical fix — globals.css는 안 건드림 (다른 페이지 영향 없게).

### 미해결 / 명일 우선 검증 항목
- [ ] #1 본인 코인 잔액 / 새 가입 시 시작 보너스 500 자동 부여
- [ ] #2 상점 구매 UX (모달 + 토스트 + 잔액 즉시 갱신 + 잔액 부족 disabled)
- [ ] #3 게임 ItemBar (가운데 세로 + 라벨 + 튜토리얼 1회)
- [ ] #4 게임 중 코인만 픽업 (stair에 ? 박스 없음)
- [ ] 통과 후 디버그 cyan 박스 + "결과 집계 실패" 헤더 제거
- [ ] Phase 8 §1단계~§6단계 QA (혼자 가능부터)

---

## History — 2026-05-21 (Phase 8 1차 모바일 QA → 6개 fix 연쇄)

세션 주제: 모바일에서 발견된 문제들을 실시간으로 root cause 분석 → fix → push → 다음 보고 → 다시 root cause. 총 **6개 commit push** (`24666e2 → 02e0b26`).

### 작업 흐름 (시간 순)

1. **상점 transaction 에러** (모바일 보고: "no transactions support in neon-http driver")
   - Root cause: `src/server/db.ts`가 `drizzle-orm/neon-http`(HTTP one-shot, transaction 미지원) 사용. 그런데 `shop.buyItem`, `items.equipItems`, `match finish/tick payout` 4곳에서 `db.transaction()` 호출.
   - Fix: `drizzle-orm/neon-serverless` (Pool + WebSocket)로 driver swap. Drizzle API 동일해서 호출 코드 무변경. dev HMR 시 Pool 누수 방지로 `globalThis` 캐싱.
   - Commit: `24666e2 fix(db,bot): enable tx via neon-serverless + stop overwriting bot endReason`

2. **봇 모드 승패 비결정적 #1** (모바일 보고: "내가 이겼는데 패배")
   - Root cause: `bot-adapter.ts`가 봇 골 도달 시 두 시그널 차례로 호출 — `onOpponentTick(goalFloor)` → `store.setOpponentFloor`가 가드 통과해서 `'opponent_reached_goal'` 설정 → 직후 `onMatchEnded({reason:'normal'})` → `store.applyMatchEnded`가 winnerUserId 없는 'normal'을 `'reached_goal'`로 매핑해서 endedReason 덮어씀.
   - Fix: bot-adapter에서 `onMatchEnded({reason:'normal'})` 호출 제거. `setOpponentFloor`가 이미 store에 정확한 종료 상태 설정함. RAF 자체는 `return`으로 종료.
   - Commit: `24666e2` (위와 같은 commit, db.ts와 함께)

3. **result 페이지 임시 디버그 진단**
   - Fix가 모바일에 도달했는지 / 다른 root cause인지 가르려고 result 화면에 `end=... won=...` 표시.
   - Commit: `e06a154 chore(result): add temporary diagnostics for bot win/loss investigation`
   - 이후 텍스트가 너무 작아 사용자가 못 봤다는 보고 → cyan 박스로 강조: `701410c chore(result): make debug strip clearly visible (cyan badge)`

4. **UX 4종 개선** (모바일 보고: 구매 피드백 없음 / 게임 중 ItemBar가 ControlPad에 가려짐 / 아이템 사용법 모름)
   - **구매 UX**: ShopItemCard 클릭 → shop page에 confirm 모달(`{name} 구매 / {price}코인을 사용합니다`) → 확인 시 fetch → 성공 시 emerald 토스트 2초.
   - **ControlPad 분할**: `ControlPad.tsx`가 가운데 80px(w-20) spacer 두고 ◀/▶ 좌우 배치. flex-1 유지.
   - **ItemBar 중앙 세로**: `ItemBar.tsx`가 `fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex-col` + 각 슬롯 아래에 아이템 이름 라벨(text-[10px]).
   - **튜토리얼 팝업**: 첫 게임 시 한 번. localStorage `item_tutorial_seen`으로 dismiss 영속화.
   - Commit: `c315483 feat(ux): buy confirm + toast, center item bar above pad, item tutorial`

5. **시작 보너스 + 게임 중 아이템 픽업 제거** (모바일 보고: "리로드 후 코인 0" + "게임 중 코인을 줍는 거지 아이템은 상점에서만")
   - **register 시 coins=500**: `auth.ts`의 신규 user insert에 `coins: 500` 명시. users.coins default가 0이라 신규 가입자는 무조건 0이었음. 기존 user는 early return이라 영향 없음.
   - **stair에서 hasItem 제거**: `stair-generator.ts`가 `FREE_ITEM_SPAWN_RATE` 기반으로 매번 무작위 아이템 떨어뜨리던 로직 삭제. 이제 `hasCoin`/`isBooster`만 stair에 부여. 서버 tick에서 stair.hasItem 읽는 코드는 자동으로 no-op.
   - Commit: `dbbd710 feat(econ,gen): grant 500 starter coins + drop in-game item pickups`

6. **봇 모드 승패 비결정적 #2 — 진짜 root cause** (모바일 보고: 내 100 / 봇 98 / end=reached_goal 인데도 "패배")
   - 디버그 정보 받고 즉시 확정: store는 `'reached_goal'` 정확히 보냈는데 fetch 응답이 없음. fix #1과 별개로 server-side 버그.
   - Root cause: `src/app/api/matches/[id]/end/route.ts:29`의 `maxCoinsAvailable`이 `stairs.filter((s) => s.hasCoin).length`만 셈. 그러나 `store.ts:handleTap`은 3가지 출처에서 코인 부여 — `hasCoin`(+1), `isBooster`(+3), 5콤보 보너스(+1). 정직한 100층 플레이만 해도 totalCoins가 hasCoin 수를 초과 → "coins exceed available" 400 응답 → match flagged=true → result page는 resp.won이 undefined라 fallback '패배' 렌더.
   - Fix: validator가 3가지 출처를 모두 합산. `coinStairs + boosterStairs * 3 + Math.floor(finalFloor / 5)`.
   - Commit: `02e0b26 fix(end-route): include booster + combo coins in anti-cheat ceiling`

### Grant 스크립트 2회 실행
- 1회차: 17명 user. `Tes`만 0→500. 나머지 16명은 이미 500.
- 2회차: 19명 user. 새로 `Test`/`Toy` 추가됨(0→500). `Tes`는 500→70으로 줄어 있어서 70→500(shop 5*80 + 30 흔적). 즉 2명의 새 user가 어제 grant 후 생성됨.

### 주요 발견 / 결정

- **neon-http vs neon-serverless**: Drizzle은 두 driver가 동일 API. 단순 import 교체로 transaction 지원. `@neondatabase/serverless` v1.1+는 Node 22+ 글로벌 `WebSocket` 자동 감지 — `ws` polyfill 불필요. Vercel Fluid Compute(Node 24)에 그대로.
- **bot-adapter `onMatchEnded({reason:'normal'})`은 이중 시그널이었음**: setOpponentFloor가 이미 store 상태 갱신하므로 onMatchEnded는 잉여. PvP에서는 server가 winnerUserId 포함 payload 보내므로 필요하지만, bot 모드는 그냥 빼는 게 정답.
- **end/route.ts validator는 store의 코인 규칙을 미러해야 함**: M2 spec의 anti-cheat 의도였지만 booster·콤보 보너스를 빼먹어 honest run을 막아왔음. tick-validator는 매 tick 코인 추적해서 정확하지만 봇 매치는 tick endpoint 안 부름 → end-route validator만 작동.
- **store.applyMatchEnded는 가드 없음**: 봇 모드만 보면 PvP 영향 없게 bot-adapter 쪽을 fix하는 게 안전. PvP에서는 setOpponentFloor → server applyMatchEnded 순서로 normal하게 동작.
- **모바일이 ItemBar/ControlPad 겹침 보고**: ControlPad가 `inset-x-0`로 전폭 차지 + z-30이라 ItemBar(`fixed bottom-4 left-4`, z-default)를 덮음. 가운데 spacer 만들고 ItemBar를 그 자리에 끼우는 게 모바일 엄지에 닿기 좋고 가시성 OK. 사용자가 마리오 카트 스타일을 별도로 제안 → M4 백로그.
- **디버그 진단을 위해 result page 한시적 표시 추가**: 사용자가 "여전히 패배" 보고했을 때 fix가 안 도달한 건지 / 다른 버그인지 구분하기 위해 cyan 박스. 디버그 박스 한 줄로 100/98/reached_goal 정보 받고 진짜 root cause(#6) 즉시 확정. **검증 완료되면 제거 예정.**
- **shop에서 신규 user에게 500코인 시작 보너스**: anti-cheat 측면 우려보다 dev 환경 편의 우선. 또한 Toss 미니앱 webview가 localStorage 매번 클리어하면 매번 새 user → 매번 500. 이건 의도적.
- **사용자 본인 device localStorage 동작 미확정**: 닉네임 모달 안 떴다 했으니 같은 deviceId 같은 user. 그러나 코인 0 → shop에서 다 썼거나 (Tes 70 패턴), 또는 grant 시점에 가입 안 됐던 user. 본인 nickname 확인 필요.

### 테스트 상태
- 코드 변경 후 매 commit 직전 `npx tsc --noEmit` 통과 확인 (총 6회 모두 exit 0).
- `pnpm test`는 실행 안 함 (변경 파일들이 fakeDb 사용 단위 테스트 시그니처와 무관).

### 세션 종료 시 git 상태
- **origin/main = HEAD = `02e0b26`** (push 완료, ahead 0)
- working tree clean
- prod 배포: https://yuhan-stairs.vercel.app — 매 commit마다 Vercel auto-deploy (~33초)
- 오늘 세션 신규 commits: **6개** (24666e2, e06a154, c315483, dbbd710, 701410c, 02e0b26)

### 사용자 결정 사항
1. 배포 방식: **commit마다 즉시 main push (preview 분리 안 함)** — 매 보고 후 다음 매치 검증 사이클 빠르게.
2. 코인 grant 재실행: **GRANT_MIN_COINS=500 default** — 충분.
3. 상점 구매 UX: **확인 다이얼로그 + 토스트**.
4. ItemBar 위치: **컨트롤 패드 좁히고 가운데 세로 배치** (마리오 카트 스타일은 백로그).
5. 사용법 안내: **이름 라벨 + 1회용 튜토리얼 팝업**.
6. 시작 보너스 + 게임 중 아이템 픽업 제거 둘 다 적용.

### 미해결 / 명일 우선 검증 항목
- [ ] 사용자 본인 nickname 확인 + 잔액 검증 (19명 중 어느 user 인지)
- [ ] end/route validator fix가 진짜 작동하는지 — 100층 도달 시 "승리!" + 코인 보상 입금
- [ ] 게임 중 코인만 떨어지는지 시각적 확인
- [ ] shop confirm 모달 + 토스트 동작
- [ ] ItemBar 가운데 세로 배치 + 라벨 + 튜토리얼 1회 표시
- [ ] 검증 완료 후 디버그 cyan 박스 제거

---

## History — 2026-05-20 (Phase 5-7 코드 완료 + prod 배포 + bg/coins fix)

### 작업 흐름

1. **Phase 5 (Task 17-21)**: 5개 UI 컴포넌트 직접 작성 — ShopItemCard / SlotPicker / ItemBar / BombOverlay / ParallaxLayers. plan 템플릿이 styled-jsx에 의존했으나 Next.js 16에서 미옵트인 → globals.css에 `@keyframes parallax-slow/fast` 추가하고 컴포넌트는 className으로 참조.
2. **Phase 6 (Task 22-26)**: 5개 페이지 작업.
   - `/shop`: ShopItemCard 그리드 + SlotPicker + 코인 + 다음 매치 슬롯 sessionStorage 저장.
   - `/about`: BGM 라이선스 + 캐릭터 아트워크 출처 (TRACKS 배열 비어있어도 fallback 안내).
   - `/mode-select`: 장착 슬롯 미리보기 + slots URL param 전달.
   - matching: slots URL param parse → match_ready/paired 직전 equip API 호출 (fire-and-forget) → game URL에 slots 전달. bot redirect에도 slots 전달.
   - `/game`: URL slots → `useGame.setEquippedSlots()`. ranked는 onCountdown init() 직후에도 re-seed.
   - 홈: shop 링크 + 코인 표시 (`j?.coins`) + MuteToggle + BGM preload.
3. **Phase 7 (Task 27-31)**: 가장 큰 통합 단계.
   - Task 27: `comboLerpSpeed` + `lerpCameraToFloor` + `targetWorldY` 분리. setCameraToFloor는 instant-jump escape hatch로 남김. vitest 2개 추가.
   - Task 28: `renderStair`에 `opts.isMine` 추가 + `hasItem` 자동 픽업 박스 (`?` 표시).
   - Task 29: effects.ts에 `showBeanstalkJump`, `showShieldFlash`. FeverOverlay 컴포넌트 + globals.css `@keyframes fever-pulse`.
   - Task 30: game/[matchId]/page.tsx 거의 재작성. Adapter signature 확장(`onItemPicked`, `onBombTriggered`에 id 추가) + JSX 마운트(ParallaxLayers/ItemBar/BombOverlay/FeverOverlay) + useEffect 3개(BGM, playbackRate, beanstalk/shield 시각) + Pixi ticker lerp/mines re-render.
   - Task 31: `/api/matches/[id]/end`에 `itemsUsed` 추가, result 페이지에서 myUserId fetch + emoji/이름 표시, result_jingle 재생.
4. **검증**: pnpm test 111 passing. tsc 통과. 15 commits 분할.
5. **Production 배포** (`146d15b`): 사용자가 회사 PC라 모바일 QA 필요해서 `git push origin main` (40 commits) → Vercel GitHub 통합으로 https://yuhan-stairs.vercel.app 자동 배포. 33초만에 success.
6. **모바일 QA 1차 피드백**: 게임 동작 OK, 그러나 (a) 코인 0이라 아이템 QA 불가 (b) 배경 안 보임 (`bg.png` 미적용 + main `bg-slate-950`가 ParallaxLayers를 가림).
7. **즉시 수정**:
   - bg.png 처리 (`cfc94e9`): `.orig-images/bg.png` 원본(887×1774)의 ChatGPT 워터마크를 `scripts/prepare_bg.py`로 페인트오버(워터마크 바로 위 8px row 샘플링 → 110px 영역에 리사이즈해서 덮어쓰기) + 540×1080으로 다운스케일 → `public/bg.png` 생성. game 페이지 `<main>`에 `bg-cover` 적용 + `stage.ts`의 Pixi Application을 `backgroundAlpha: 0`으로 투명화해서 bg가 비치도록.
   - 코인 grant (`19354c7`): `scripts/grant-coins.mjs` (Neon serverless + drizzle 사용, `GRANT_MIN_COINS` env로 임계값 설정). 즉시 실행하여 16명 유저 모두 500 코인 부여 + transactions audit row 기록.
8. **재배포** (`19354c7`): push → Vercel 자동 빌드 → success. prod에 bg.png + 투명 캔버스 적용 완료.

### 주요 발견 / 결정

- **`/api/users/me` 응답 shape**: plan template은 `j?.user?.coins`로 가정했으나 실제는 flat `{id,nickname,coins,level}`. home/result/game 모두 `j?.coins`/`j?.id`로 직접 접근.
- **styled-jsx 미옵트인**: plan의 `<style jsx>{}` 블록은 동작 안 함. globals.css의 named class + keyframe으로 대체 (parallax-slow/fast/fever-pulse).
- **bot 매치는 use API 불가**: `/api/matches/[id]/items/use` 라우트가 `opp?.userId` 없으면 400. 봇은 participants가 1명뿐이라 use 항상 실패. PvP 아이템 QA는 ranked 매치(또는 두 탭 self-match)로 검증 필요.
- **Adapter callback ID 필터링**: item_picked / bomb_triggered도 mine_placed처럼 targetUserId(또는 userId)를 broadcast. Adapter signature 확장 + 게임 페이지에서 `myUserIdRef.current !== id` 가드. 양쪽 화면이 동시에 어두워지거나 잘못된 슬롯 채워지는 것 방지.
- **store.init이 equippedSlots 초기화**: ranked의 경우 onCountdown 안에서 init() 후 slots를 다시 seed. bot은 init() → seedSlotsFromUrl() 순서로 자연 해결.
- **Mine visual re-render 트리거**: Pixi ticker에 `lastMinesKey` (sorted mines join) 비교 → 변경 시 모든 기존 stair container destroy + 재렌더. 새 stair는 add 시점에 `isMine: mineSet.has(f)` 전달.
- **camera lerp 방향**: `targetWorldY(floor)`는 floor 증가에 따라 **증가** (content가 음수 y에 배치되어 world.y가 보정). 초기 테스트 assertion 정정.
- **ParallaxLayers가 안 보였던 이유**: `fixed inset-0 -z-10`인데 main이 `bg-slate-950` (z-auto = 0) opaque → ParallaxLayers가 main 뒤에 깔려서 완전히 가려짐. 그래서 사용자가 "배경 안 보임"이라고 보고. bg.png를 main에 적용하면서 동일한 한계 — ParallaxLayers는 여전히 가려져있지만 bg.png가 보이니 UX적으로 해결됨. ParallaxLayers의 combo 가속은 현재 동작 안 함 (별도 작업 필요, 백로그).
- **Vercel GitHub 통합 빌드 속도**: 40 commits 일괄 push에도 33초만에 production deploy. test workflow(GitHub Actions) + Vercel build가 거의 동시 실행되고 Vercel은 더 빨리 끝남.
- **bg.png 워터마크 처리법**: AI 생성 이미지의 corner watermark는 PIL로 페인트오버(주변 row sampling)가 가장 간단. crop은 콘텐츠 손실. inpainting은 오버킬.

### 테스트 상태 (세션 종료 시점)
- pnpm test: **111 passing, 0 failures, 0 regressions** (18 test files)
- 신규 테스트: 2개 추가 (camera tier + world-y direction)

### 세션 종료 시 git 상태
- **origin/main = HEAD = `19354c7`** (push 완료, ahead 0)
- working tree clean
- **prod 배포 완료**: https://yuhan-stairs.vercel.app
- 오늘 세션 신규 commits: **17개** (Phase 5: 5 + Phase 6: 5 + Phase 7: 5 + bg: 1 + scripts: 1)
- 누적 M3 commits (origin/main에서): 42개

### 오늘 사용자 결정 사항
1. 배포 방식: **Production push (main)** — 권장 선택, yuhan-stairs.vercel.app에 자동 배포.
2. 코인 부여: **내 유저 코인 500 일회성 주입** — 권장 선택, scripts/grant-coins.mjs로 처리.
3. bg.png 적용 범위: **게임 페이지에만** — 권장 선택, 다른 페이지는 백로그.

---

## History — 2026-05-19 (Phase 0-4 + 트랙 1 그래픽 적용)

요약: M3 Phase 0-4 (16/32 task) 완료. 트랙 1 그래픽 5 commits. 25 commits ahead. PIXI/React 19 strict-mode race 회피 (1s deferred destroy). 자세한 내용은 git log 참조.

---

## History — 2026-05-18 (저녁 세션: M3 spec/plan/Phase 0-1)

요약: M3 brainstorming → spec/plan 작성 → Phase 0-1 (Task 1-7) 일부 완료. 자세한 내용은 git log 참조.

---

## History — 2026-05-18 (오전 세션: 그래픽 에셋 적용)

요약: Python script 5개로 stair/캐릭터 sprite 분리. 자세한 내용은 git log 참조.

---

## 참고 명령

```bash
# 작업 위치 진입
cd C:\temp\Playground\app-in-toss\game\pj1-muhan

# 개발 / 검증
pnpm dev                              # http://localhost:3000 (또는 3001)
pnpm exec tsc --noEmit                # 타입체크
pnpm test                             # vitest (111 passing 기대)

# 그래픽 재생성 (필요 시)
python scripts/split_ca3.py           # 24 idle/jump 재생성
python scripts/remove_black_bg.py stair.png public/stair.png
python scripts/prepare_bg.py          # 워터마크 페인트오버 + 다운스케일

# DB
pnpm db:generate                      # schema → migration sql
pnpm db:push                          # 변경분 Neon 적용
pnpm db:studio                        # GUI
node scripts/grant-coins.mjs          # 모든 유저 코인 top-up (default 500)

# 상태 확인
git log --oneline -10                 # 최근 커밋 (마지막 19354c7)
git status                            # uncommitted 확인
git log --oneline origin/main..HEAD   # push할 commits (현재 0개, 모두 push됨)

# Vercel 배포 상태
gh api repos/heyday1019/yuhan-stairs/commits/HEAD/statuses --jq '.[] | "[\(.context)] \(.state) - \(.description)"'
curl -sI https://yuhan-stairs.vercel.app | head -8

# 모바일 QA 시
# 1. 시크릿 탭 또는 하드 새로고침으로 Vercel CDN 캐시 우회
# 2. https://yuhan-stairs.vercel.app
```

Claude에게 시작 시 던질 한 줄: **"task-log.md 열고 모바일 QA 이어서 진행해줘"**
