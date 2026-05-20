import { describe, it, expect } from 'vitest';
import { comboLerpSpeed, targetWorldY } from '@/game/camera';

describe('camera', () => {
  it('lerp speed tiers', () => {
    expect(comboLerpSpeed(0)).toBe(0.12);
    expect(comboLerpSpeed(5)).toBe(0.15);
    expect(comboLerpSpeed(10)).toBe(0.25);
    expect(comboLerpSpeed(20)).toBe(0.4);
    expect(comboLerpSpeed(50)).toBe(0.6);
  });

  it('target world.y compensates upward as the player ascends', () => {
    // Stair content is laid out at y = -(floor-1) * 50, so to keep the
    // player anchored at PLAYER_Y the world container must shift downward
    // — i.e. world.y increases monotonically with floor.
    expect(targetWorldY(2)).toBeGreaterThan(targetWorldY(1));
    expect(targetWorldY(10)).toBeGreaterThan(targetWorldY(2));
  });
});
