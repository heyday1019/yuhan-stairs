'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PixiCanvas } from '@/components/PixiCanvas';
import { Hud } from '@/components/Hud';
import { InputOverlay } from '@/components/InputOverlay';
import { useGame } from '@/game/store';
import { generateStairs } from '@/shared/stair-generator';
import { startBotLoop } from '@/game/loop';
import { renderVisibleStairs } from '@/game/renderers/stair';
import { createPlayer } from '@/game/renderers/player';
import { setCameraToFloor } from '@/game/camera';
import type { Application } from 'pixi.js';
import { Container } from 'pixi.js';

interface BotMatchResp { matchId: string; seed: string; mode: number; botDifficulty: 'easy'|'normal'|'hard'; }

export default function GamePage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const [meta, setMeta] = useState<BotMatchResp | null>(null);
  const init = useGame((s) => s.init);
  const setBotFloor = useGame((s) => s.setBotFloor);
  const tickTimers = useGame((s) => s.tickTimers);
  const stairs = useGame((s) => s.stairs);
  const ended = useGame((s) => s.endedReason);

  useEffect(() => {
    const url = new URL(window.location.href);
    const seed = url.searchParams.get('seed') ?? params.matchId;
    const diff = (url.searchParams.get('diff') ?? 'normal') as 'easy'|'normal'|'hard';
    const mode = Number(url.searchParams.get('mode') ?? '100');
    const stairList = generateStairs(seed, mode);
    init({ matchId: params.matchId, goalFloor: mode, stairs: stairList, botDifficulty: diff });
    setMeta({ matchId: params.matchId, seed, mode, botDifficulty: diff });
  }, [params.matchId, init]);

  useEffect(() => {
    if (!meta || stairs.length === 0) return;
    const loop = startBotLoop({
      stairs,
      difficulty: meta.botDifficulty,
      onTick: (floor) => setBotFloor(floor),
    });
    const ticker = setInterval(() => tickTimers(performance.now()), 200);
    return () => { loop.stop(); clearInterval(ticker); };
  }, [meta, stairs, setBotFloor, tickTimers]);

  useEffect(() => {
    if (ended && meta) {
      const t = setTimeout(() => router.push(`/result/${meta.matchId}`), 800);
      return () => clearTimeout(t);
    }
  }, [ended, meta, router]);

  const onPixiReady = useCallback((app: Application) => {
    const world = new Container();
    app.stage.addChild(world);
    let stairsRendered = false;
    const player = createPlayer();
    world.addChild(player.container);
    app.ticker.add(() => {
      const { stairs: curStairs, playerFloor: curFloor } = useGame.getState();
      if (curStairs.length === 0) return;
      if (!stairsRendered) {
        renderVisibleStairs(world, curStairs, Math.max(1, curFloor));
        stairsRendered = true;
      }
      const anchorFloor = Math.max(1, curFloor);
      setCameraToFloor(world, anchorFloor);
      const stair = curStairs[anchorFloor - 1];
      if (stair) {
        player.container.x = (stair.dir === 'L' ? 60 : 240) + 60;
        player.container.y = -(stair.floor - 1) * 50 - 22;
        player.setFlipped(stair.dir === 'L');
      }
    });
  }, []);

  return (
    <main className="relative mx-auto h-dvh w-full max-w-[420px] bg-slate-950">
      <Hud />
      <PixiCanvas width={360} height={780} onReady={onPixiReady} />
      <InputOverlay />
    </main>
  );
}
