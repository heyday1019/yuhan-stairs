'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PixiCanvas } from '@/components/PixiCanvas';
import { Hud } from '@/components/Hud';
import { InputOverlay } from '@/components/InputOverlay';
import { ControlPad } from '@/components/ControlPad';
import { CountdownOverlay } from '@/components/CountdownOverlay';
import { WaitingOpponent } from '@/components/WaitingOpponent';
import { useGame } from '@/game/store';
import { generateStairs } from '@/shared/stair-generator';
import { createBotAdapter } from '@/game/sync/bot-adapter';
import { createNetworkAdapter } from '@/game/sync/network-adapter';
import { renderStair } from '@/game/renderers/stair';
import { createPlayer } from '@/game/renderers/player';
import { setCameraToFloor } from '@/game/camera';
import { flashCombo, showFailPopup } from '@/game/renderers/effects';
import type { Application } from 'pixi.js';
import { Container } from 'pixi.js';
import type { OpponentSyncAdapter } from '@/game/sync/types';

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
  const [meta, setMeta] = useState<{ type: 'bot'|'ranked'; mode: number; seed: string|null; diff: 'easy'|'normal'|'hard' } | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const type = (url.searchParams.get('type') ?? 'bot') as 'bot'|'ranked';
    const mode = Number(url.searchParams.get('mode') ?? '100');
    const seedParam = url.searchParams.get('seed');
    const diff = (url.searchParams.get('diff') ?? 'normal') as 'easy'|'normal'|'hard';

    if (type === 'bot') {
      const seed = seedParam ?? params.matchId;
      const stairList = generateStairs(seed, mode);
      init({ matchId: params.matchId, goalFloor: mode, stairs: stairList, botDifficulty: diff });
      setMeta({ type, mode, seed, diff });
      setMatchStartAt(performance.now());
    } else {
      setMeta({ type, mode, seed: null, diff });
    }
  }, [params.matchId, init, setMatchStartAt]);

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
          setMatchStartAt(localStart);
        },
        onOpponentGrace: (remainingMs) => setOpponentDisconnectedGrace(remainingMs),
        onOpponentResumed: () => setOpponentResumed(),
      });
      adapterRef.current = adapter;

      const ticker = setInterval(() => {
        tickTimers(performance.now());
        const s = useGame.getState();
        adapter.sendTick({
          floor: s.playerFloor, combo: s.combo.combo, coins: s.coinsCollected, failCount: s.failCount,
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

  const onPixiReady = useCallback((app: Application) => {
    const world = new Container();
    app.stage.addChild(world);
    const stairContainers = new Map<number, Container>();
    const player = createPlayer();
    world.addChild(player.container);
    let lastFailCount = 0;
    let lastCombo = 0;
    app.ticker.add(() => {
      const { stairs: curStairs, playerFloor: curFloor, failCount, combo } = useGame.getState();
      if (curStairs.length === 0) return;
      const anchorFloor = Math.max(1, curFloor);
      const lo = Math.max(1, anchorFloor - 5);
      const hi = Math.min(curStairs.length, anchorFloor + 15);
      for (let f = lo; f <= hi; f++) {
        if (!stairContainers.has(f)) stairContainers.set(f, renderStair(world, curStairs[f - 1]));
      }
      setCameraToFloor(world, anchorFloor);
      const stair = curStairs[anchorFloor - 1];
      if (stair) {
        player.container.x = stair.x + 60;
        player.container.y = -(stair.floor - 1) * 50 - 22;
        player.setFlipped(stair.dir === 'L');
      }
      if (failCount > lastFailCount) { showFailPopup(app.stage, 160, 200); lastFailCount = failCount; }
      if (combo.combo > lastCombo && combo.combo % 5 === 0) { flashCombo(app.stage, combo.combo); }
      lastCombo = combo.combo;
    });
  }, []);

  return (
    <main className="relative mx-auto h-dvh w-full max-w-[420px] bg-slate-950">
      <Hud />
      <PixiCanvas width={360} height={780} onReady={onPixiReady} />
      <InputOverlay />
      <ControlPad />
      {matchStartAtMs !== null && performance.now() < matchStartAtMs && (
        <CountdownOverlay startAtMs={matchStartAtMs} onDone={() => { /* state machine handles unlock via matchStartAtMs */ }} />
      )}
      {graceMs !== null && <WaitingOpponent remainingMs={graceMs} />}
    </main>
  );
}
