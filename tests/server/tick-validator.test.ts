import { describe, it, expect } from 'vitest';
import { validateTick, type ValidatorState } from '@/server/tick-validator';
import type { Stair } from '@/shared/types';

const stairs: Stair[] = Array.from({ length: 100 }, (_, i) => ({
  floor: i + 1, dir: i % 2 === 0 ? 'L' : 'R', x: 60, hasCoin: false,
  isBooster: i === 9 || i === 19,
}));

const baseState = (over: Partial<ValidatorState> = {}): ValidatorState => ({
  matchStartedAtMs: 0, lastSeq: 0, lastFloor: 0, flaggedCount: 0, ...over,
});

describe('validateTick', () => {
  it('정상 1층 진행', () => {
    const r = validateTick({ seq: 1, floor: 1, lastEvent: undefined }, baseState(), stairs, 100);
    expect(r.ok).toBe(true);
    expect(r.nextState.lastSeq).toBe(1);
    expect(r.nextState.lastFloor).toBe(1);
  });

  it('seq 역행 거부', () => {
    const r = validateTick({ seq: 1, floor: 1 }, baseState({ lastSeq: 2 }), stairs, 100);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('seq_not_monotonic');
  });

  it('floor +9 거부', () => {
    const r = validateTick({ seq: 1, floor: 9 }, baseState({ lastFloor: 0 }), stairs, 1000);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('floor_jump_too_large');
  });

  it('floor +8 허용 (booster 묶음)', () => {
    const r = validateTick({ seq: 1, floor: 8 }, baseState({ lastFloor: 0 }), stairs, 1000);
    expect(r.ok).toBe(true);
  });

  it('floor -3 허용 (실패)', () => {
    const r = validateTick({ seq: 2, floor: 7 }, baseState({ lastSeq: 1, lastFloor: 10 }), stairs, 2000);
    expect(r.ok).toBe(true);
  });

  it('floor -4 거부', () => {
    const r = validateTick({ seq: 2, floor: 6 }, baseState({ lastSeq: 1, lastFloor: 10 }), stairs, 2000);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('floor_regress_too_large');
  });

  it('상한선 위반 → flag 증가, ok=false', () => {
    const r = validateTick({ seq: 1, floor: 5 }, baseState(), stairs, 50);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('rate_limit');
    expect(r.nextState.flaggedCount).toBe(1);
  });

  it('booster 이벤트가 booster 계단에서 발생', () => {
    const r = validateTick({ seq: 1, floor: 10, lastEvent: 'booster' }, baseState({ lastFloor: 9 }), stairs, 1000);
    expect(r.ok).toBe(true);
  });

  it('booster 이벤트인데 일반 계단 → flag 증가', () => {
    const r = validateTick({ seq: 1, floor: 5, lastEvent: 'booster' }, baseState({ lastFloor: 4 }), stairs, 1000);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('booster_seed_mismatch');
    expect(r.nextState.flaggedCount).toBe(1);
  });

  it('flagged_count 임계치 ≥3 invalidated 표시', () => {
    const s = baseState({ flaggedCount: 2 });
    const r = validateTick({ seq: 1, floor: 5 }, s, stairs, 50);
    expect(r.invalidated).toBe(true);
  });
});

describe('validateTick — M3 extensions', () => {
  it('beanstalk_use(+5)는 rate-limit 캡을 우회하여 통과', () => {
    // 50ms 시점에 floor 5 (정상 cap이라면 5*90=450ms 필요 → rate_limit인데 우회)
    const r = validateTick(
      { seq: 1, floor: 5, lastEvent: 'beanstalk_use' },
      baseState({ lastFloor: 0 }),
      stairs,
      50,
    );
    expect(r.ok).toBe(true);
    expect(r.nextState.lastFloor).toBe(5);
    expect(r.nextState.lastSeq).toBe(1);
  });

  it('beanstalk_use 라도 +9는 floor_jump_too_large', () => {
    const r = validateTick(
      { seq: 1, floor: 9, lastEvent: 'beanstalk_use' },
      baseState({ lastFloor: 0 }),
      stairs,
      50,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('floor_jump_too_large');
  });

  it('mine_hit는 nextState.lastInputLockUntilMs를 serverNow+1000으로 설정', () => {
    const r = validateTick(
      { seq: 2, floor: 10, lastEvent: 'mine_hit' },
      baseState({ lastSeq: 1, lastFloor: 10 }),
      stairs,
      3000,
    );
    expect(r.ok).toBe(true);
    expect(r.nextState.lastInputLockUntilMs).toBe(4000);
  });

  it('input lock 구간의 tick은 input_locked로 거부 (flag 미증가)', () => {
    const s = baseState({ lastSeq: 1, lastFloor: 10, lastInputLockUntilMs: 4000, flaggedCount: 0 });
    const r = validateTick({ seq: 2, floor: 11 }, s, stairs, 3500);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('input_locked');
    expect(r.nextState.flaggedCount).toBe(0);
  });

  it('input lock 만료 직후 tick은 통과', () => {
    const s = baseState({ lastSeq: 1, lastFloor: 10, lastInputLockUntilMs: 4000 });
    const r = validateTick({ seq: 2, floor: 11 }, s, stairs, 4000);
    expect(r.ok).toBe(true);
  });

  it('ok 경로에서 lock 필드는 명시적 변경이 없으면 보존', () => {
    const s = baseState({ lastSeq: 1, lastFloor: 10, lastInputLockUntilMs: 0 });
    const r = validateTick({ seq: 2, floor: 11 }, s, stairs, 2000);
    expect(r.ok).toBe(true);
    expect(r.nextState.lastInputLockUntilMs).toBe(0);
  });
});
