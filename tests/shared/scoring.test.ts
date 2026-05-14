import { describe, it, expect } from 'vitest';
import { computeFinalScore, computeCoinReward } from '@/shared/scoring';

describe('computeFinalScore', () => {
  it('applies the formula: floor*10 + combo*5 + coins*2 - fails*8', () => {
    expect(computeFinalScore({ finalFloor: 100, maxCombo: 20, totalCoins: 10, failCount: 2 }))
      .toBe(100 * 10 + 20 * 5 + 10 * 2 - 2 * 8);
  });

  it('never returns negative', () => {
    expect(computeFinalScore({ finalFloor: 0, maxCombo: 0, totalCoins: 0, failCount: 100 })).toBe(0);
  });
});

describe('computeCoinReward', () => {
  it('returns winner reward for 100-mode ranked', () => {
    expect(computeCoinReward({ mode: 100, won: true, isBot: false })).toBe(30);
  });
  it('returns loser participation reward for 100-mode ranked', () => {
    expect(computeCoinReward({ mode: 100, won: false, isBot: false })).toBe(5);
  });
  it('returns bot-match reward for 100-mode bot win', () => {
    expect(computeCoinReward({ mode: 100, won: true, isBot: true })).toBe(10);
  });
});
