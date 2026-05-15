import { describe, it, expect, vi } from 'vitest';

vi.mock('@/server/db', () => ({ db: {}, schema: {} }));

import { computeRankedPayout } from '@/server/economy';

describe('computeRankedPayout', () => {
  it('100층 ranked 승자 +30, 패자 +5', () => {
    const r = computeRankedPayout(100);
    expect(r).toEqual({ winner: 30, loser: 5 });
  });

  it('100층 disconnect win 승자 +30, 패자 +0', () => {
    const r = computeRankedPayout(100, 'opponent_disconnect');
    expect(r).toEqual({ winner: 30, loser: 0 });
  });
});
