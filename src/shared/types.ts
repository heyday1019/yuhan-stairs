import type { Mode } from './constants';

export type Direction = 'L' | 'R';

export interface Stair {
  floor: number;             // 1-based
  dir: Direction;
  x: number;                 // world-space x of stair left edge (px)
  hasCoin: boolean;
  isBooster: boolean;
}

export interface TickEvent {
  floor: number;
  combo: number;
  score: number;
  lastEvent?: 'fail' | 'boost' | 'item';
  ts: number;                // monotonic ms
}

export interface MatchSpec {
  matchId: string;
  mode: Mode;
  seed: string;
  startedAt: number;         // ms epoch
}

export interface FinalResult {
  finalFloor: number;
  finalScore: number;
  maxCombo: number;
  totalCoins: number;        // coins picked up in-game
  failCount: number;
  endReason: 'reached_goal' | 'opponent_reached_goal' | 'timeout' | 'abandoned' | 'opponent_disconnect' | 'invalidated';
}

export type BotDifficulty = 'easy' | 'normal' | 'hard';
