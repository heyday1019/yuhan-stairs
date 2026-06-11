import type { Stair } from '@/shared/types';

export interface ValidatorState {
  matchStartedAtMs: number;
  lastSeq: number;
  lastFloor: number;
  flaggedCount: number;
  lastInputLockUntilMs?: number;
}

export interface TickInput {
  seq: number;
  floor: number;
  lastEvent?: 'fail' | 'booster' | 'item' | 'beanstalk_use' | 'mine_hit';
  combo?: number;
}

export type TickReason =
  | 'seq_not_monotonic'
  | 'floor_jump_too_large'
  | 'floor_regress_too_large'
  | 'rate_limit'
  | 'booster_seed_mismatch'
  | 'input_locked';

export interface TickResult {
  ok: boolean;
  reason?: TickReason;
  nextState: ValidatorState;
  invalidated?: boolean;
}

const MIN_MS_PER_FLOOR = 90;
const MAX_FLOOR_JUMP = 8;
const MAX_FLOOR_REGRESS = 3;
const FLAG_THRESHOLD = 3;
const MINE_INPUT_LOCK_MS = 1000;

export function validateTick(
  tick: TickInput,
  state: ValidatorState,
  stairs: Stair[],
  serverNowMsSinceStart: number,
): TickResult {
  if (tick.seq <= state.lastSeq) {
    return { ok: false, reason: 'seq_not_monotonic', nextState: state };
  }
  // input lock — expected condition (no flag)
  const lockUntil = state.lastInputLockUntilMs ?? 0;
  if (serverNowMsSinceStart < lockUntil) {
    return { ok: false, reason: 'input_locked', nextState: { ...state, lastSeq: tick.seq } };
  }
  const delta = tick.floor - state.lastFloor;
  if (delta > MAX_FLOOR_JUMP) {
    return { ok: false, reason: 'floor_jump_too_large', nextState: { ...state, lastSeq: tick.seq } };
  }
  if (delta < -MAX_FLOOR_REGRESS) {
    return { ok: false, reason: 'floor_regress_too_large', nextState: { ...state, lastSeq: tick.seq } };
  }
  // rate-limit: beanstalk_use with exactly +5 bypasses the cap for this single tick
  const beanstalkBypass = tick.lastEvent === 'beanstalk_use' && delta === 5;
  if (!beanstalkBypass && tick.floor > 0 && serverNowMsSinceStart / MIN_MS_PER_FLOOR < tick.floor) {
    const flaggedCount = state.flaggedCount + 1;
    return {
      ok: false,
      reason: 'rate_limit',
      nextState: { ...state, lastSeq: tick.seq, flaggedCount },
      invalidated: flaggedCount >= FLAG_THRESHOLD,
    };
  }
  if (tick.lastEvent === 'booster') {
    const stair = stairs[tick.floor - 1];
    if (!stair || !stair.isBooster) {
      const flaggedCount = state.flaggedCount + 1;
      return {
        ok: false,
        reason: 'booster_seed_mismatch',
        nextState: { ...state, lastSeq: tick.seq, flaggedCount },
        invalidated: flaggedCount >= FLAG_THRESHOLD,
      };
    }
  }
  const nextState: ValidatorState = {
    ...state,
    lastSeq: tick.seq,
    lastFloor: tick.floor,
  };
  if (tick.lastEvent === 'mine_hit') {
    nextState.lastInputLockUntilMs = serverNowMsSinceStart + MINE_INPUT_LOCK_MS;
  }
  return { ok: true, nextState };
}
