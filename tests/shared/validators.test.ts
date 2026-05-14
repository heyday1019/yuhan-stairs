import { describe, it, expect } from 'vitest';
import { validateFloorProgression, validateTickRate } from '@/shared/validators';

describe('validateFloorProgression', () => {
  it('allows non-negative floor delta within MAX_FLOORS_PER_SECOND', () => {
    expect(validateFloorProgression({ prevFloor: 10, prevAt: 1000, nextFloor: 15, nextAt: 1500 })).toBe(true);
  });
  it('rejects impossible jump (e.g., 50 floors in 100ms)', () => {
    expect(validateFloorProgression({ prevFloor: 10, prevAt: 1000, nextFloor: 60, nextAt: 1100 })).toBe(false);
  });
  it('allows up to +5 jump for beanstalk item even within 50ms', () => {
    expect(validateFloorProgression({ prevFloor: 10, prevAt: 1000, nextFloor: 15, nextAt: 1050, allowItemJump: 5 })).toBe(true);
  });
  it('rejects going beyond goal floor', () => {
    expect(validateFloorProgression({ prevFloor: 99, prevAt: 1000, nextFloor: 101, nextAt: 1100, goalFloor: 100 })).toBe(false);
  });
});

describe('validateTickRate', () => {
  it('allows ticks at >= 100ms apart', () => {
    expect(validateTickRate({ prevAt: 1000, nextAt: 1100 })).toBe(true);
  });
  it('rejects ticks at <100ms apart (rate limit)', () => {
    expect(validateTickRate({ prevAt: 1000, nextAt: 1099 })).toBe(false);
  });
});
