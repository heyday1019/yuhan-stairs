# 유한의 계단 레이스 — 작업 로그

작업 디렉토리: `C:\temp\Playground\app-in-toss\game\pj1-muhan`
관련 메모리: `[[project-stair-race-current-state]]`

> **이 파일을 매일 열어서 "다음 진행할 작업"부터 읽으면 바로 이어 작업 가능.**
> 끝낸 작업은 "History"로 옮기고, 다음 작업을 명시한 채로 세션 종료.

---

## 다음 진행할 작업 (2026-05-19 이어서 시작)

오늘(2026-05-18) **두 트랙**의 작업이 있었음:
1. **오전: 그래픽 에셋 적용** (Phase 1, 클라이언트만) — 코드 변경 끝 + **uncommitted**, 시각 검증 미완
2. **저녁: M3 spec/plan/Phase 0-1 구현** — 코드 commit (push 안 함), Task 6 reviewer 미실행

내일 시작 시 두 트랙 중 **어느 쪽 먼저** 진행할지 사용자에게 확인. 후보 우선순위:

### A안 — 그래픽 검증 우선 (간단, 빠른 마무리)
- uncommitted 변경 (그래픽 + sprite 통합) 작동 검증
- 통과 시 3개 commit으로 정리, push
- 그 후 M3 트랙으로 이동

### B안 — M3 진행 (오늘 흐름 유지)
- Task 6 (useItem) reviewer 실행 후 OK 시 완료
- Task 7 (tick-validator 확장) implementer + reviewer
- Phase 1 마무리 후 Phase 2 (API routes) 진입
- 그래픽 변경은 그대로 두고 나중 통합

### C안 — 둘 다 (병행)
- 오전: 그래픽 검증 + 커밋
- 오후: M3 Task 6+7 진행

세션 시작 시 사용자에게 묻고 진행.

---

## 즉시 시작 가능 — 트랙 1: 그래픽 검증 (오전 세션 미완)

### 0. 세션 시작 시
1. `task-log.md` 이 파일 읽기
2. `pnpm dev` 실행 (`run_in_background: true`)
3. `git status` — 그래픽 트랙의 uncommitted 파일들 확인
4. 메모리 `project-stair-race-current-state.md`도 일독

### 1. 시각 검증 (최우선)
사용자가 오전 적용 결과 확인 못 했음. http://localhost:3000 접속 → NicknameModal → 캐릭터 선택 → 봇 매치.

**체크 포인트:**
- [ ] NicknameModal 그리드에 12개 캐릭터 침투 없이 또렷
- [ ] 게임 화면에서 stair sprite가 네온 큐브로 자연스럽게
- [ ] 본인 캐릭터가 선택한 토끼 idle sprite
- [ ] 계단 오를 때마다 jump sprite로 swap + 위로 14px parabolic arc + 180ms 후 idle 복귀
- [ ] 상대(봇)도 같은 점프 모션
- [ ] 콘솔에 `split` 에러 없음
- [ ] PIXI `Assets.unload` 경고 없음

**튜닝 가능 매직넘버 (`src/game/`):**
- `renderers/player.ts`: `PLAYER_WIDTH=56`, `JUMP_DURATION_MS=180`, `JUMP_HEIGHT_PX=14`
- `renderers/stair.ts`: `STAIR_W=120`, `STAIR_SPRITE_H=117`, `TREAD_BAND=22`
- `camera.ts`: `FLOOR_HEIGHT=50`, `PLAYER_Y=480`

### 2. 선명도 개선 (옵션, 1번에서 흐릿하다면)
- PIXI 텍스처 `source.autoGenerateMipmaps = true`
- Sprite width/height을 정수로 강제 (sub-pixel blur 방지)
- `image-rendering: -webkit-optimize-contrast` (NicknameModal 썸네일)

### 3. 커밋
1번/2번 통과 후 묶음 커밋. 분할 권장:
- `feat(assets): add stair + bunny sprite assets and split scripts` (public/, scripts/)
- `feat(game): replace graphics primitives with sprites and jump animation` (src/game/, src/components/, src/app/game/)
- `feat(ui): add character picker to NicknameModal` (src/components/NicknameModal.tsx)

**원본 에셋 처리 결정 필요**: `bg.png`, `ca1.png`, `ca2.png`, `ca3.png`, `stair.png`, `.orig-images/`를 repo에 넣을지 .gitignore 처리할지. `yuhan.pen`도 동일. → 사용자에게 묻기.

### 4. 그래픽 트랙 후속 (Phase 2 — 상대방 실제 캐릭터)
지금은 상대 = 고정 `crystal-tophat` fallback. 실제 상대 캐릭터 표시하려면:

**옵션 A: Redis match payload 확장** (DB 변경 없음, 권장)
- `/api/matchmaking/enqueue` 요청 body에 `characterId` 추가
- `matchmaking.ts`에서 ZSET member에 character 포함 (또는 별도 hash)
- atomic pair 시 두 user의 character를 match 정보에 저장
- Pusher `match_start` 이벤트 payload에 `p1Character`, `p2Character` 포함
- 클라이언트가 `onCountdown`에서 받아 character 적용

**옵션 B: DB users.character_id 컬럼 추가** (영구 저장)
- 마이그레이션 + `/api/users/register`에서 character 받기

### 5. bg.png 적용 위치 결정
홈/매칭/게임 어디에 깔지 사용자에게 묻기.

---

## 즉시 시작 가능 — 트랙 2: M3 구현 (저녁 세션 이어서)

### 0. 세션 시작 시
1. `git log --oneline -10` — 최근 커밋 확인 (마지막 `a5776a3`)
2. `pnpm test` — 79 passing 확인
3. M3 spec/plan 빠르게 참조: `docs/superpowers/specs/2026-05-18-stair-race-m3-design.md` (commit `b61559a`), `docs/superpowers/plans/2026-05-18-stair-race-m3.md`

### 1. Task 6 review 마무리 (즉시)

어제 Task 6 (server/items.ts useItem 3종 분기) implementer는 끝났으나 **spec + code 리뷰가 안 돌아갔다**. commit `a5776a3` 이미 main에 있음.

**Combined spec+code reviewer subagent dispatch:**
- 대상 commit: `a5776a3`
- 변경 파일: `src/server/items.ts` (useItem + UseResult + getMatchState helper 추가), `tests/server/items.test.ts` (6 신규 테스트)
- 검증 포인트:
  - `match:state`를 STRING+JSON으로 읽는지 (M2 패턴, `lastFloor` 필드)
  - bomb rate limit이 정확히 10s 안 두 번째 호출 거부하는지
  - mine 위치가 `[opp+1, opp+5]` 범위인지
  - 사용 후 `lrem`으로 슬롯에서 정확히 1개만 제거하는지
- reviewer가 OK 하면 Task 6 완료 표시

### 2. Task 7 — tick-validator 확장

계획서: `docs/superpowers/plans/2026-05-18-stair-race-m3.md` Task 7 섹션 그대로.

- 파일: `src/server/tick-validator.ts` 수정, `tests/server/tick-validator.test.ts` 추가
- 추가 lastEvent: `'beanstalk_use'`, `'mine_hit'`, `'shield_used'`
- 신규 검증:
  - beanstalk_use: 상한선(90ms/층) 1회 면제, +5 범위 안
  - mine_hit: `lastInputLockUntilMs = serverNow + 1000` set
  - 입력 lock 활성 중 tick → 거부
  - shield_used: 콤보 ≥20 + shieldArmedUntilMs 안인지
- 기존 validator의 시그니처 확장: `PrevState`에 `lastInputLockUntilMs`, `shieldArmedUntilMs`, `shieldConsumed`, `combo` 추가
- TDD: 5 신규 테스트 케이스
- model: sonnet (validator 룰 변경이라 신중)

### 3. Phase 2 (Task 8~12) API routes

Task 8: GET /api/shop/items
Task 9: POST /api/shop/buy
Task 10: POST /api/matches/[id]/items/equip
Task 11: POST /api/matches/[id]/items/use (Pusher 4종 broadcast)
Task 12: tick route 확장 (픽업 처리 + shield/lock state)

⚠️ **Phase 2 끝나면 사용자 작업 필요**: `pnpm db:push` (Task 1에서 generated migration `drizzle/migrations/0001_mighty_the_phantom.sql`을 Neon에 적용). 그래야 dev 서버에서 실제 API 호출 가능.

### 4. Phase 3~7
Phase 3 (audio + MuteToggle), Phase 4 (store + adapter), Phase 5 (UI 컴포넌트), Phase 6 (페이지), Phase 7 (게임 통합), Phase 8 (수동 QA).

---

## M3 진행 상태 표

| Phase | Task | 상태 | Commit |
|---|---|---|---|
| 0 | 1 (DB schema) | ✅ | `5a4d23f` |
| 0 | 2 (items catalog) | ✅ | `1e61533` |
| 1 | 3 (shop getCatalog/getInventory) | ✅ | `a481c1f` |
| 1 | 4 (shop buyItem) | ✅ | `dcd2ab8` |
| 1 | 5 (items equipItems) | ✅ | `abf0f82` → fix `ebb60f1` |
| 1 | 6 (items useItem) | 🟡 코드만, **review 대기** | `a5776a3` |
| 1 | 7 (tick-validator 확장) | ⬜ | — |
| 2 | 8-12 (API routes) | ⬜ | — |
| 3 | 13-14 (audio + MuteToggle) | ⬜ | — |
| 4 | 15-16 (store + adapter) | ⬜ | — |
| 5 | 17-21 (UI 컴포넌트) | ⬜ | — |
| 6 | 22-26 (페이지) | ⬜ | — |
| 7 | 27-31 (게임 통합) | ⬜ | — |
| 8 | 32 (수동 QA + push) | ⬜ | 사용자 작업 |

**5/32 완료 + 1개 코드만 완료** (Task 6 review 대기). M3 진행률 약 16%.

---

## 진실 소스 / 빠른 참조

- **M3 spec**: `docs/superpowers/specs/2026-05-18-stair-race-m3-design.md` (commit `b61559a`)
- **M3 plan**: `docs/superpowers/plans/2026-05-18-stair-race-m3.md` (gitignored, 32 task, 2633줄)
- **M2 spec**: `docs/superpowers/specs/2026-05-15-stair-race-m2-design.md`
- **M2 plan**: `docs/superpowers/plans/2026-05-15-stair-race-m2.md` (gitignored)
- **M1 spec**: `docs/superpowers/specs/2026-05-13-stair-race-design.md`

**M3 범위 (3종 아이템 + 콤보 폴리시 + 상점 + BGM)**:
- bomb (80코인, 3초 후 상대 화면 1.5초 가림, 게임 영향 0)
- mine (30코인, 상대 다음 5칸 중 1칸 지뢰, 밟으면 1초 정지)
- beanstalk (50코인, 본인 즉시 +5층, 콤보 유지)
- 상점 `/shop` 라우트 + 인벤토리 슬롯 3개
- 콤보 5/10/20/50 단계 시각 효과 강화, 카메라 lerp 가속, 배경 패럴랙스
- WebAudio BGM (main/matching/game/fever/result 5슬롯, Pixabay/FMA 등 무료 라이선스)
- 이모티콘/추월 알림은 M4로 미룸

---

## 사용자 작업 백로그 (코드 task 외)

- [ ] **그래픽 트랙 시각 검증** (오전 세션의 uncommitted 변경 사항)
- [ ] **그래픽 트랙 커밋 분할 + push 결정**
- [ ] **원본 에셋 처리** (bg.png, ca1.png, ca2.png, ca3.png, stair.png, .orig-images/, yuhan.pen) repo 포함 여부
- [ ] **`pnpm db:push`** (M3 Task 1에서 generated `drizzle/migrations/0001_mighty_the_phantom.sql`을 Neon에 적용) — Phase 2 (Task 8+) 시점에 필요
- [ ] **BGM 5개 트랙 다운로드 + 배치** — `public/audio/main_theme.mp3` 등 (M3 spec §4.4 검색 키워드 참조). Phase 7 (Task 30) 전 권장.
- [ ] **CC-BY 트랙 사용 시 `/about` 페이지 출처 배열에 항목 추가** (Task 23 코드 위치)
- [ ] **아이템 아이콘 PNG** (선택) — 우선 이모지(💣💥🌱💀)로 동작, 나중에 `public/sprites/items/` 64×64 PNG
- [ ] **Vercel 대시보드에서 Pusher 6개 env BOM 재등록** (이전 세션 미완료)

---

## History — 2026-05-18 (저녁 세션: M3 spec/plan/Phase 0-1)

### 작업 흐름

1. **이전 세션 컨텍스트 확인** — M2가 통과되어 M3 시작.
2. **M3 brainstorming** (superpowers:brainstorming skill)
   - Q1: M3 1차 목표 → "게임 깊이 — 아이템 + 콤보/부스터 폴리시"
   - Q2: 범위 → "3종 전부 + 콤보 폴리시 (M2 규모)"
   - Q3: 아이템 획득 → "픽업 + 코인 구매 (소형 상점 포함)"
   - Q4: 상점 위치 → "별도 /shop 라우트"
   - Q5: 이모티콘/추월 알림 → "넣지 않음 — M4로"
   - 추가: 가속 체감 + BGM (Pixabay/FMA/incompetech 무료 라이선스 큐레이션)
3. **접근법 결정**: C — 가로 계층 (M2 패턴 동일)
4. **spec 작성 + commit**: `docs/superpowers/specs/2026-05-18-stair-race-m3-design.md` (`b61559a`)
   - 12 섹션, 409줄
   - self-review에서 2개 모호함 수정 (BGM 트랙명 placeholder 명확화, playbackRate 단순화)
5. **plan 작성** (superpowers:writing-plans skill)
   - `docs/superpowers/plans/2026-05-18-stair-race-m3.md` (gitignored, 2633줄, 32 task)
   - self-review에서 jsonb default + matching BGM crossfade 보완
6. **Subagent-driven execution 시작**
   - 브랜치 전략: main 직접 (M2와 동일)
   - 진행 방식: Phase 단위 체크포인트
   - 32 task TaskCreate로 등록

### Phase 0 — 완료

| Task | Commit | 내용 | 비고 |
|---|---|---|---|
| 1 | `5a4d23f` | drizzle schema (matches.items_used jsonb + inventory_items 테이블) + migration `0001_mighty_the_phantom.sql` | spec ✅ / code ✅ (FK onDelete는 no action — M2 패턴 일관성, YAGNI). **`pnpm db:push`는 사용자 작업으로 보류** |
| 2 | `1e61533` | `src/shared/items-catalog.ts` + 3 vitest 테스트 | spec ✅ / code 강함 |

### Phase 1 — 부분 진행 (Task 3-5 완료, Task 6 review 미실행)

| Task | Commit | 내용 | 비고 |
|---|---|---|---|
| 3 | `a481c1f` | server/shop.ts: getCatalog, getInventoryFor + 3 tests | spec ✅ / code ✅ |
| 4 | `dcd2ab8` | server/shop.ts: buyItem 트랜잭션 + 4 tests | spec ✅ / code 강함 (test metadata 가벼운 minor 누락, skip) |
| 5 | `abf0f82` → `ebb60f1` | server/items.ts: equipItems + RedisClient에 rpush/lrange/lrem/expire 추가 + fake-redis 확장 + 6 tests | **Critical 발견**: implementer가 `_userId`/`_itemId` 사이드 채널을 drizzle .set()에 넣음 → real Postgres에서 "column does not exist" 에러. **fix dispatched**: insert+onConflictDoUpdate 패턴(buyItem과 동일)으로 교체. `ebb60f1` 검증 완료 |
| 6 | `a5776a3` | server/items.ts: useItem 3종 (beanstalk/mine/bomb) + rate limit + 6 tests | implementer DONE, **reviewer 미실행** — 내일 즉시 진행 |

### 테스트 상태 (저녁 세션 종료 시점)
- pnpm test: **79 passing, 0 failures, 0 regressions** (15 test files)
- 신규 테스트: 15개 추가 (items-catalog 3 + shop 7 + items 15)

### 주요 발견 / 결정

- **M2 `match:state`는 STRING+JSON** (`{ matchStartedAtMs, lastSeq, lastFloor, flaggedCount }`), HASH 아님. plan의 `hgetall` 표기 무시하고 `r.get` + `JSON.parse` + `lastFloor` 필드 사용.
- **drizzle .set()에 unknown 키 절대 금지** — 사이드 채널 패턴은 fake-db에서만 동작, real Postgres에서 column 에러. upsert로 우회.
- **RedisClient interface 확장 필요**: rpush/lrange/lrem/expire — Task 5에서 추가.

---

## History — 2026-05-18 (오전 세션: 그래픽 에셋 적용)

### 컨텍스트
이전 세션에서 ChatGPT 워터마크 제거된 그래픽 에셋(`bg.png`, `stair.png`, `ca1.png`, `ca2.png`)이 루트에 준비돼 있었으나 코드는 PIXI Graphics 단색 도형 그대로였음. 이번 세션에서 에셋을 코드에 연결.

### 작업 단위

#### 1. 그래픽 에셋 가공
| 작업 | 결과 |
|---|---|
| `stair.png` 검정 배경 제거 | `scripts/remove_black_bg.py` (smoothstep, low=30 high=90). `public/stair.png` (1271×1237) |
| `ca2.png` 12개 캐릭터 분리 (1차) | `scripts/split_characters.py` — 단순 그리드 분할. 옆 캐릭터 침투 발견 |
| 검은 토끼(#11) 별도 처리 | `scripts/fix_black_bunny.py` — floodfill 기반 (luminance 임계로는 본체 사라짐) |
| **ca2 12개 재분리 (개선)** | `scripts/split_characters_v2.py` — 글로벌 floodfill + `scipy.ndimage.label`로 cell 중심부 컴포넌트만 유지. 침투 해소 |
| **ca3.png 24개 sprite 분리** | `scripts/split_ca3.py` — 6×4 그리드, 짝수열=idle 홀수열=jump. cell별 floodfill + connected component. 점프 sprite의 별/먼지 효과 보존 |
| ca2 잔재 12개 삭제 | ca3 idle/jump 24개로 대체 |

**scipy 신규 설치** (`python -m pip install scipy`) — 분리 정확도 향상.

#### 2. 코드 변경
| 파일 | 내용 |
|---|---|
| `src/game/characters.ts` (신규) | 12종 캐릭터 메타데이터. `Character = {id, label, idle, jump}`. `DEFAULT_CHARACTER_ID`, `OPPONENT_FALLBACK_ID`, `CHARACTER_STORAGE_KEY` 상수. `getCharacter(id)` |
| `src/game/stage.ts` | PIXI `Assets.load` 추가. 1 stair + 24 character textures preload. `StageHandle.textures: StageTextures` 반환. `world.sortableChildren = true` |
| `src/game/renderers/stair.ts` | Graphics → Sprite(stair.png). `STAIR_W=120`, `STAIR_SPRITE_H=117`, `TREAD_BAND=22`, `SPRITE_Y_OFFSET=-95`. booster는 `tint=0xfde68a`. `zIndex = -stair.floor`로 낮은 층이 앞에 |
| `src/game/renderers/player.ts` | Graphics → Sprite(idle/jump 2장). `jump(now)` API + `update(now)` state machine. `JUMP_DURATION_MS=180`, `JUMP_HEIGHT_PX=14`, parabolic arc (`sin(t*π)`). 종료 시 idle 텍스처 복귀 |
| `src/components/PixiCanvas.tsx` | `onReady(app, textures)` 시그니처 변경 |
| `src/components/NicknameModal.tsx` | 4×3 캐릭터 선택 grid 추가. localStorage `stair_race.character_id` 저장. 닉네임 + 캐릭터 둘 다 입력해야 onReady |
| `src/app/game/[matchId]/page.tsx` | localStorage에서 character 로드 → 본인 sprite. 상대는 `OPPONENT_FALLBACK_ID` (crystal-tophat, alpha 0.85). ticker에서 floor 증가 감지 시 `player.jump(now)` 트리거 + 매 프레임 `player.update(now)` |

#### 3. 버그 픽스
| 증상 | 원인 | 픽스 |
|---|---|---|
| `Uncaught TypeError: Cannot read properties of null (reading 'split')` 게임 페이지에서 | `app.destroy(true, {children: true, **texture: true**})`이 Assets-managed 텍스처를 force destroy → Assets cache에 dangling reference → PIXI 내부 split() | `app.destroy(true, {children: true})`로 변경 (texture 옵션 제거) |
| ca2 분리본에 옆 캐릭터 침투 | 단순 그리드 분할이 cell 경계를 캐릭터 가운데로 자름 + padding이 옆 cell 침범 | floodfill로 전역 배경 제거 후 cell별 `ndimage.label`로 중심부 컴포넌트만 유지 |

### 검증 (오전 세션 종료 시점)
- `pnpm exec tsc --noEmit` 통과 (no output)
- `pnpm test` — 73 tests pass (이전 57 → +16)
- `pnpm dev`로 dev 서버 정상 기동, http://localhost:3000
- **시각적 검증은 사용자 미완료** — 내일 트랙 1로 이어짐

### 오전 세션 종료 시 git 상태 (모두 uncommitted)
```
M next-env.d.ts                                  (turbopack/next.js 자동 생성)
M src/app/game/[matchId]/page.tsx
M src/components/NicknameModal.tsx
M src/components/PixiCanvas.tsx
M src/game/renderers/player.ts
M src/game/renderers/stair.ts
M src/game/stage.ts
?? src/game/characters.ts
?? public/stair.png
?? public/characters/                            (24 idle/jump PNGs + 미리보기 3장)
?? scripts/                                      (remove_black_bg, split_characters, split_characters_v2, fix_black_bunny, split_ca3)
?? .orig-images/, bg.png, ca1.png, ca2.png, ca3.png, stair.png, yuhan.pen, src/stairs.jpg, public/_preview_*
```

⚠️ **저녁 M3 세션 후 git 상태**: 위 그래픽 변경분은 모두 그대로 uncommitted (저녁 세션은 신규 파일만 추가). M3 commit들은 별도 트리에 정렬됨. 다음 세션 시작 시 `git status`로 확인.

---

## 참고 명령

```bash
# 작업 위치 진입
cd C:\temp\Playground\app-in-toss\game\pj1-muhan

# 개발 / 검증
pnpm dev                              # http://localhost:3000
pnpm exec tsc --noEmit                # 타입체크
pnpm test                             # vitest

# 그래픽 재생성 (필요 시)
python scripts/split_ca3.py           # 24 idle/jump 재생성
python scripts/split_characters_v2.py # ca2 12종 재생성 (현재 deprecated)
python scripts/remove_black_bg.py stair.png public/stair.png

# 상태 확인
git log --oneline -10                 # 최근 커밋 (마지막 M3 커밋 a5776a3)
git status                            # uncommitted 그래픽 변경 확인
```

Claude에게 시작 시 던질 한 줄: **"task-log.md 열어서 다음 진행할 작업 보고, 어디부터 갈지 알려줘"**
