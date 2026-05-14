import { advanceBot, createBot } from '@/shared/bot';
import type { Stair, BotDifficulty } from '@/shared/types';

export interface LoopHandle { stop(): void; }

export function startBotLoop(args: {
  stairs: Stair[];
  difficulty: BotDifficulty;
  onTick: (floor: number, elapsedMs: number) => void;
  startedAt?: number;
}): LoopHandle {
  let state = createBot({ stairs: args.stairs, difficulty: args.difficulty, startedAt: args.startedAt ?? performance.now() });
  let cancelled = false;
  const step = () => {
    if (cancelled) return;
    const now = performance.now();
    if (now >= state.nextTickAt) {
      state = advanceBot(state, now);
      args.onTick(state.floor, state.elapsedMs);
      if (state.floor >= args.stairs.length) return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return { stop() { cancelled = true; } };
}
