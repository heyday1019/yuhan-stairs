import type { Stair, BotDifficulty } from './types';
import { createRng } from './rng';

interface BotState {
  stairs: Stair[];
  difficulty: BotDifficulty;
  floor: number;
  elapsedMs: number;
  failCount: number;
  nextTickAt: number;
  rng: ReturnType<typeof createRng>;
}

const DIFFICULTY_PROFILE: Record<BotDifficulty, { msPerStep: number; accuracy: number }> = {
  easy:   { msPerStep: 450, accuracy: 0.85 },
  normal: { msPerStep: 300, accuracy: 0.92 },
  hard:   { msPerStep: 200, accuracy: 0.97 },
};

export function createBot(args: { stairs: Stair[]; difficulty: BotDifficulty; startedAt: number }): BotState {
  const profile = DIFFICULTY_PROFILE[args.difficulty];
  return {
    stairs: args.stairs,
    difficulty: args.difficulty,
    floor: 0,
    elapsedMs: 0,
    failCount: 0,
    nextTickAt: args.startedAt + profile.msPerStep,
    rng: createRng(`bot-${args.difficulty}-${args.stairs.length}`),
  };
}

export function advanceBot(s: BotState, nowMs: number): BotState {
  const profile = DIFFICULTY_PROFILE[s.difficulty];
  const succeed = s.rng.next() < profile.accuracy;
  let floor = s.floor;
  let failCount = s.failCount;
  if (succeed) {
    floor = Math.min(s.stairs.length, floor + 1);
  } else {
    failCount++;
    // Bot fail = missed tap (no progress this step). Different from player's wrong-direction tap (-3 floors).
  }
  return {
    ...s,
    floor,
    failCount,
    elapsedMs: nowMs,
    nextTickAt: nowMs + profile.msPerStep,
  };
}
