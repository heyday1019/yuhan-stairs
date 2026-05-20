'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PixiCanvas } from '@/components/PixiCanvas';
import { Hud } from '@/components/Hud';
import { InputOverlay } from '@/components/InputOverlay';
import { ControlPad } from '@/components/ControlPad';
import { CountdownOverlay } from '@/components/CountdownOverlay';
import { WaitingOpponent } from '@/components/WaitingOpponent';
import { ItemBar } from '@/components/ItemBar';
import { BombOverlay } from '@/components/BombOverlay';
import { ParallaxLayers } from '@/components/ParallaxLayers';
import { FeverOverlay } from '@/components/FeverOverlay';
import { useGame } from '@/game/store';
import { generateStairs } from '@/shared/stair-generator';
import { createBotAdapter } from '@/game/sync/bot-adapter';
import { createNetworkAdapter } from '@/game/sync/network-adapter';
import { renderStair } from '@/game/renderers/stair';
import { createPlayer } from '@/game/renderers/player';
import { lerpCameraToFloor } from '@/game/camera';
import { flashCombo, showFailPopup, showBeanstalkJump, showShieldFlash } from '@/game/renderers/effects';
import { apiFetch } from '@/lib/match-network';
import { audio } from '@/lib/audio';
import type { Application, Container as PixiContainer } from 'pixi.js';
import { Container } from 'pixi.js';
import type { OpponentSyncAdapter } from '@/game/sync/types';
import type { StageTextures } from '@/game/stage';
import { CHARACTER_STORAGE_KEY, DEFAULT_CHARACTER_ID, OPPONENT_FALLBACK_ID, getCharacter } from '@/game/characters';

export default function GamePage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const init = useGame((s) => s.init);
  const setOpponentFloor = useGame((s) => s.setOpponentFloor);
  const setMatchStartAt = useGame((s) => s.setMatchStartAt);
  const setOpponentDisconnectedGrace = useGame((s) => s.setOpponentDisconnectedGrace);
  const setOpponentResumed = useGame((s) => s.setOpponentResumed);
  const applyMatchEnded = useGame((s) => s.applyMatchEnded);
  const tickTimers = useGame((s) => s.tickTimers);
  const stairs = useGame((s) => s.stairs);
  const ended = useGame((s) => s.endedReason);
  const matchStartAtMs = useGame((s) => s.matchStartAtMs);
  const graceMs = useGame((s) => s.opponentDisconnectedGraceMs);
  const adapterRef = useRef<OpponentSyncAdapter | null>(null);
  const myUserIdRef = useRef<string | null>(null);
  const stageRef = useRef<PixiContainer | null>(null);
  const [meta, setMeta] = useState<{ type: 'bot'|'ranked'; mode: number; seed: string|null; diff: 'easy'|'normal'|'hard' } | null>(null);

  useEffect(() => {
    apiFetch('/api/users/me')
      .then((r) => r.json())
      .then((j: { id?: string }) => { myUserIdRef.current = j?.id ?? null; })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const type = (url.searchParams.get('type') ?? 'bot') as 'bot'|'ranked';
    const mode = Number(url.searchParams.get('mode') ?? '100');
    const seedParam = url.searchParams.get('seed');
    const diff = (url.searchParams.get('diff') ?? 'normal') as 'easy'|'normal'|'hard';
    const slotsRaw = url.searchParams.get('slots');

    const seedSlotsFromUrl = () => {
      if (!slotsRaw) return;
      try {
        const parsed = JSON.parse(slotsRaw) as (string | null)[];
        useGame.getState().setEquippedSlots(parsed);
      } catch {}
    };

    if (type === 'bot') {
      const seed = seedParam ?? params.matchId;
      const stairList = generateStairs(seed, mode);
      init({ matchId: params.matchId, goalFloor: mode, stairs: stairList, botDifficulty: diff });
      seedSlotsFromUrl();
      setMeta({ type, mode, seed, diff });
      setMatchStartAt(performance.now());
    } else {
      // For ranked, init runs inside onCountdown after match_start arrives — re-seed slots there.
      seedSlotsFromUrl();
      setMeta({ type, mode, seed: null, diff });
    }
  }, [params.matchId, init, setMatchStartAt]);

  useEffect(() => {
    // BGM: crossfade main_theme → game_loop while in-game. play() is a no-op
    // if the track hasn't been preloaded, so this stays safe even when the
    // user lands directly on /game without going through the home preload.
    audio.crossfade('main_theme', 'game_loop', 300);
    return () => { audio.crossfade('game_loop', 'main_theme', 300); };
  }, []);

  useEffect(() => {
    // Combo-driven BGM tempo ramp.
    const unsub = useGame.subscribe((s, p) => {
      if (s.combo.combo !== p.combo.combo) {
        const rate = s.combo.combo >= 50 ? 1.15 : s.combo.combo >= 20 ? 1.08 : 1.0;
        audio.setPlaybackRate('game_loop', rate);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Pixi-side visual feedback for beanstalk jumps and shield consumption.
    const unsub = useGame.subscribe((s, p) => {
      if (s.beanstalkJumpAt && s.beanstalkJumpAt !== p.beanstalkJumpAt) {
        if (stageRef.current) showBeanstalkJump(stageRef.current, s.beanstalkJumpAt.fromFloor, s.beanstalkJumpAt.toFloor);
      }
      if (s.shieldConsumed && !p.shieldConsumed) {
        if (stageRef.current) showShieldFlash(stageRef.current);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!meta) return;
    let cleanup: (() => void) | undefined;
    if (meta.type === 'bot' && stairs.length > 0) {
      const adapter = createBotAdapter({ stairs, difficulty: meta.diff, goalFloor: meta.mode });
      adapter.start({
        onOpponentTick: ({ floor }) => setOpponentFloor(floor),
        onMatchEnded: (e) => applyMatchEnded(e),
      });
      adapterRef.current = adapter;
      const ticker = setInterval(() => tickTimers(performance.now()), 200);
      cleanup = () => { adapter.stop(); clearInterval(ticker); };
    } else if (meta.type === 'ranked') {
      const adapter = createNetworkAdapter(params.matchId);
      adapter.start({
        onOpponentTick: ({ floor }) => setOpponentFloor(floor),
        onMatchEnded: (e) => applyMatchEnded(e),
        onCountdown: (startAtMs, seed, mode) => {
          // Webhook re-broadcasts match_start on every member_added so late
          // subscribers can recover, which means an already-initialized client
          // can receive a duplicate. Skip to avoid wiping progress.
          if (useGame.getState().matchStartAtMs !== null) return;
          const localStart = performance.now() + (startAtMs - Date.now());
          const stairList = generateStairs(seed, mode);
          init({ matchId: params.matchId, goalFloor: mode, stairs: stairList, botDifficulty: 'normal' });
          try {
            const slotsRaw = new URL(window.location.href).searchParams.get('slots');
            if (slotsRaw) {
              const parsed = JSON.parse(slotsRaw) as (string | null)[];
              useGame.getState().setEquippedSlots(parsed);
            }
          } catch {}
          setMatchStartAt(localStart);
        },
        onOpponentGrace: (remainingMs) => setOpponentDisconnectedGrace(remainingMs),
        onOpponentResumed: () => setOpponentResumed(),
        onItemPicked: (userId, itemId, _floor, slotIndex) => {
          if (myUserIdRef.current && userId !== myUserIdRef.current) return;
          useGame.getState().applyItemPicked(itemId, slotIndex);
        },
        onMinePlaced: (targetUserId, floor) => {
          if (myUserIdRef.current && targetUserId !== myUserIdRef.current) return;
          useGame.getState().applyMine(floor);
        },
        onBombTriggered: (targetUserId, atMs, durationMs) => {
          if (myUserIdRef.current && targetUserId !== myUserIdRef.current) return;
          useGame.getState().applyBomb(atMs, durationMs);
        },
        onBeanstalkUsed: (userId, from, to) => {
          // Self-jump is already reflected by store.useSlot()'s optimistic
          // update — only mirror opponent jumps onto the opp floor here.
          if (myUserIdRef.current && userId === myUserIdRef.current) return;
          setOpponentFloor(to);
          void from;
        },
      });
      adapterRef.current = adapter;

      const ticker = setInterval(() => {
        tickTimers(performance.now());
        const s = useGame.getState();
        const pending = useGame.getState().consumePendingTickEvent();
        adapter.sendTick({
          floor: s.playerFloor,
          combo: s.combo.combo,
          coins: s.coinsCollected,
          failCount: s.failCount,
          ...(pending ? { lastEvent: pending } : {}),
        });
      }, 200);

      const unsub = useGame.subscribe((next, prev) => {
        if (next.failCount > prev.failCount) {
          adapter.sendTick({ floor: next.playerFloor, combo: next.combo.combo, coins: next.coinsCollected, failCount: next.failCount, lastEvent: 'fail' });
        }
        const justSteppedOnBooster = next.playerFloor > prev.playerFloor && next.stairs[next.playerFloor - 1]?.isBooster;
        if (justSteppedOnBooster) {
          adapter.sendTick({ floor: next.playerFloor, combo: next.combo.combo, coins: next.coinsCollected, failCount: next.failCount, lastEvent: 'booster' });
        }
      });

      cleanup = () => { adapter.stop(); clearInterval(ticker); unsub(); };
    }
    return cleanup;
  }, [meta, stairs.length, params.matchId, setOpponentFloor, applyMatchEnded, setMatchStartAt, tickTimers, init, setOpponentDisconnectedGrace, setOpponentResumed]);

  useEffect(() => {
    if (ended && meta) {
      const s = useGame.getState();
      adapterRef.current?.sendFinish({
        finalFloor: s.playerFloor,
        finalScore: 0,
        maxCombo: s.combo.maxCombo,
        coins: s.coinsCollected,
      });
      const t = setTimeout(() => router.push(`/result/${params.matchId}`), 800);
      return () => clearTimeout(t);
    }
  }, [ended, meta, router, params.matchId]);

  const onPixiReady = useCallback((app: Application, textures: StageTextures) => {
    const world = new Container();
    world.sortableChildren = true;
    app.stage.addChild(world);
    stageRef.current = app.stage;
    const stairContainers = new Map<number, Container>();

    const myCharId = (typeof window !== 'undefined' && localStorage.getItem(CHARACTER_STORAGE_KEY)) || DEFAULT_CHARACTER_ID;
    const myChar = getCharacter(myCharId);
    const fallback = textures.characters.values().next().value!;
    const myTex = textures.characters.get(myChar.id) ?? fallback;
    const player = createPlayer(myTex.idle, myTex.jump);
    world.addChild(player.container);

    // Opponent: Phase 1 uses a fixed sprite — the real opponent character is wired in Phase 2.
    const oppTex = textures.characters.get(OPPONENT_FALLBACK_ID) ?? fallback;
    const opponent = createPlayer(oppTex.idle, oppTex.jump);
    opponent.container.alpha = 0.85;
    world.addChild(opponent.container);

    let lastFailCount = 0;
    let lastCombo = 0;
    let lastPlayerFloor = 0;
    let lastOpponentFloor = 0;
    let lastMinesKey = '';
    app.ticker.add(() => {
      const now = performance.now();
      const state = useGame.getState();
      const { stairs: curStairs, playerFloor: curFloor, opponentFloor: oppFloor, failCount, combo, mines } = state;
      if (curStairs.length === 0) return;

      if (curFloor > lastPlayerFloor) player.jump(now);
      lastPlayerFloor = curFloor;
      if (oppFloor > lastOpponentFloor) opponent.jump(now);
      lastOpponentFloor = oppFloor;
      player.update(now);
      opponent.update(now);

      const mineSet = new Set(mines);
      const mineKey = [...mines].sort((a, b) => a - b).join(',');
      if (mineKey !== lastMinesKey) {
        // Rebuild any already-rendered stair so newly placed mines show up.
        for (const [f, node] of stairContainers) {
          const stair = curStairs[f - 1];
          if (!stair) continue;
          world.removeChild(node);
          node.destroy({ children: true });
          stairContainers.set(f, renderStair(world, stair, textures.stair, { isMine: mineSet.has(f) }));
        }
        lastMinesKey = mineKey;
      }

      const anchorFloor = Math.max(1, curFloor);
      const lo = Math.max(1, anchorFloor - 5);
      const hi = Math.min(curStairs.length, anchorFloor + 15);
      for (let f = lo; f <= hi; f++) {
        if (!stairContainers.has(f)) {
          stairContainers.set(f, renderStair(world, curStairs[f - 1], textures.stair, { isMine: mineSet.has(f) }));
        }
      }
      lerpCameraToFloor(world, anchorFloor, combo.combo);
      const stair = curStairs[anchorFloor - 1];
      if (stair) {
        player.container.x = stair.x + 60;
        player.container.y = -(stair.floor - 1) * 50 - 22;
        player.setFlipped(stair.dir === 'L');
      }
      const oppStair = curStairs[Math.max(1, oppFloor) - 1];
      if (oppStair) {
        opponent.container.x = oppStair.x + 60;
        opponent.container.y = -(oppStair.floor - 1) * 50 - 22;
        opponent.setFlipped(oppStair.dir === 'L');
        opponent.container.visible = oppFloor > 0;
      } else {
        opponent.container.visible = false;
      }
      if (failCount > lastFailCount) { showFailPopup(app.stage, 160, 200); lastFailCount = failCount; }
      if (combo.combo > lastCombo && combo.combo % 5 === 0) { flashCombo(app.stage, combo.combo); }
      lastCombo = combo.combo;
    });
  }, []);

  return (
    <main className="relative mx-auto h-dvh w-full max-w-[420px] bg-slate-950">
      <ParallaxLayers />
      <Hud />
      <PixiCanvas width={360} height={780} onReady={onPixiReady} />
      <InputOverlay />
      <ControlPad />
      <ItemBar />
      <BombOverlay />
      <FeverOverlay />
      {matchStartAtMs !== null && performance.now() < matchStartAtMs && (
        <CountdownOverlay startAtMs={matchStartAtMs} onDone={() => { /* state machine handles unlock via matchStartAtMs */ }} />
      )}
      {graceMs !== null && <WaitingOpponent remainingMs={graceMs} />}
    </main>
  );
}
