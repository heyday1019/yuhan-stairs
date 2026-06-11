import type { BoostId } from '@/shared/shop-catalog';

const BOOST_AMT = 0.25;

const BASE_ODDS: Record<string, number> = {
  beanstalk: 0.30,
  bomb:      0.25,
  mine:      0.25,
  lightning: 0.20,
};

const BOOST_TARGETS: Partial<Record<BoostId, string>> = {
  beanstalk_up: 'beanstalk',
  lightning_up: 'lightning',
};

export function computeBoxInterval(playerFloor: number, opponentFloor: number): number {
  const gap = opponentFloor - playerFloor;
  if (gap >= 10) return 3;
  if (gap >= 5)  return 5;
  if (gap >= 0)  return 8;
  return 10; // player is ahead
}

export function hasBoxAtFloor(floor: number, opponentFloor: number, lastBoxFloor: number): boolean {
  if (floor <= 0) return false;
  if (floor <= lastBoxFloor) return false;
  const interval = computeBoxInterval(floor, opponentFloor);
  return floor % interval === 0;
}

export function pickRandomItem(boosts: BoostId[]): string {
  const odds = { ...BASE_ODDS };

  for (const boost of boosts) {
    const target = BOOST_TARGETS[boost];
    if (!target || !(target in odds)) continue;
    const extra = Math.min(BOOST_AMT, 1 - odds[target]);
    odds[target] += extra;
    const others = Object.keys(odds).filter(k => k !== target);
    const reduceEach = extra / others.length;
    for (const k of others) odds[k] = Math.max(0, odds[k] - reduceEach);
  }

  const r = Math.random();
  let cumulative = 0;
  for (const [item, prob] of Object.entries(odds)) {
    cumulative += prob;
    if (r < cumulative) return item;
  }
  return 'beanstalk'; // fallback (floating point edge case)
}
