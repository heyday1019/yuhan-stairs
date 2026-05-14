import { COIN_REWARDS } from './constants';
import type { Mode } from './constants';

export interface ScoreInputs {
  finalFloor: number;
  maxCombo: number;
  totalCoins: number;
  failCount: number;
}

export function computeFinalScore(i: ScoreInputs): number {
  return Math.max(0, i.finalFloor * 10 + i.maxCombo * 5 + i.totalCoins * 2 - i.failCount * 8);
}

export function computeCoinReward(args: { mode: Mode; won: boolean; isBot: boolean }): number {
  const t = COIN_REWARDS[args.mode];
  if (args.isBot) return args.won ? t.botWin : t.botLose;
  return args.won ? t.win : t.lose;
}
