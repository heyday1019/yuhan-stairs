import { describe, it, expect } from 'vitest';
import { createRng } from '@/shared/rng';

describe('createRng', () => {
  it('produces deterministic sequence for the same seed', () => {
    const a = createRng('match-001');
    const b = createRng('match-001');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('produces different sequence for different seeds', () => {
    const a = createRng('match-001');
    const b = createRng('match-002');
    expect(a.next()).not.toEqual(b.next());
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng('match-001');
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('supports nextInt(min, max) inclusive', () => {
    const rng = createRng('match-001');
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(1, 5);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});
