import { describe, it, expect } from 'vitest';
import { computeBoxInterval, hasBoxAtFloor, pickRandomItem } from '@/game/box-spawn';

describe('computeBoxInterval', () => {
  it('player ahead (gap negative) → interval 10', () => {
    expect(computeBoxInterval(20, 10)).toBe(10);
  });
  it('gap 0 → interval 8', () => {
    expect(computeBoxInterval(10, 10)).toBe(8);
  });
  it('gap 1-4 → interval 8', () => {
    expect(computeBoxInterval(10, 12)).toBe(8);
    expect(computeBoxInterval(10, 14)).toBe(8);
  });
  it('gap 5-9 → interval 5', () => {
    expect(computeBoxInterval(10, 15)).toBe(5);
    expect(computeBoxInterval(10, 19)).toBe(5);
  });
  it('gap 10+ → interval 3', () => {
    expect(computeBoxInterval(10, 20)).toBe(3);
    expect(computeBoxInterval(0, 100)).toBe(3);
  });
});

describe('hasBoxAtFloor', () => {
  it('floor 0 → never a box', () => {
    expect(hasBoxAtFloor(0, 10, -1)).toBe(false);
  });
  it('floor % interval === 0, not yet collected → true', () => {
    // gap=0 → interval=8, floor 8 → 8%8=0 → box
    expect(hasBoxAtFloor(8, 8, -1)).toBe(true);
  });
  it('floor % interval !== 0 → false', () => {
    expect(hasBoxAtFloor(7, 8, -1)).toBe(false);
  });
  it('floor <= lastBoxFloor → false (already collected)', () => {
    expect(hasBoxAtFloor(8, 8, 8)).toBe(false);
    expect(hasBoxAtFloor(8, 8, 10)).toBe(false);
  });
  it('gap 10+ → interval 3, floor 6 → box', () => {
    expect(hasBoxAtFloor(6, 20, 0)).toBe(true);
  });
});

describe('pickRandomItem', () => {
  it('no boosts → returns one of the 4 valid items', () => {
    const items = new Set<string>();
    for (let i = 0; i < 500; i++) items.add(pickRandomItem([]));
    // With 500 rolls, all 4 items should appear
    expect(items.has('beanstalk')).toBe(true);
    expect(items.has('bomb')).toBe(true);
    expect(items.has('mine')).toBe(true);
    expect(items.has('lightning')).toBe(true);
  });

  it('beanstalk_up → beanstalk appears more than 30% of the time', () => {
    let beanstalkCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickRandomItem(['beanstalk_up']) === 'beanstalk') beanstalkCount++;
    }
    // base 30% + boost should be > 40%
    expect(beanstalkCount / 1000).toBeGreaterThan(0.35);
  });

  it('lightning_up → lightning appears more than 20% of the time', () => {
    let count = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickRandomItem(['lightning_up']) === 'lightning') count++;
    }
    expect(count / 1000).toBeGreaterThan(0.25);
  });
});
