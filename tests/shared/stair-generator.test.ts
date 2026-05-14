import { describe, it, expect } from 'vitest';
import { generateStairs } from '@/shared/stair-generator';

describe('generateStairs', () => {
  it('produces exactly N stairs for a given count', () => {
    const stairs = generateStairs('seed-1', 100);
    expect(stairs).toHaveLength(100);
  });

  it('is deterministic for the same seed', () => {
    const a = generateStairs('seed-1', 100);
    const b = generateStairs('seed-1', 100);
    expect(a).toEqual(b);
  });

  it('produces different sequences for different seeds', () => {
    const a = generateStairs('seed-1', 100);
    const b = generateStairs('seed-2', 100);
    expect(a).not.toEqual(b);
  });

  it('numbers floors 1..N in order', () => {
    const stairs = generateStairs('seed-1', 50);
    expect(stairs.map((s) => s.floor)).toEqual([...Array(50)].map((_, i) => i + 1));
  });

  it('only uses L or R for direction', () => {
    const stairs = generateStairs('seed-1', 500);
    expect(stairs.every((s) => s.dir === 'L' || s.dir === 'R')).toBe(true);
  });

  it('keeps run length within 1..5 for any same-direction streak', () => {
    const stairs = generateStairs('seed-1', 1000);
    let run = 1;
    for (let i = 1; i < stairs.length; i++) {
      if (stairs[i].dir === stairs[i - 1].dir) run++;
      else { expect(run).toBeLessThanOrEqual(5); expect(run).toBeGreaterThanOrEqual(1); run = 1; }
    }
  });

  it('produces booster + coin spawn rates roughly matching constants', () => {
    const stairs = generateStairs('seed-rate', 5000);
    const boosters = stairs.filter((s) => s.isBooster).length;
    const coins = stairs.filter((s) => s.hasCoin).length;
    expect(boosters / 5000).toBeGreaterThan(0.02);
    expect(boosters / 5000).toBeLessThan(0.08);
    expect(coins / 5000).toBeGreaterThan(0.08);
    expect(coins / 5000).toBeLessThan(0.16);
  });
});
