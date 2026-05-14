import { createRng } from './rng';
import {
  BOOSTER_SPAWN_RATE,
  COIN_SPAWN_RATE,
  FREE_ITEM_SPAWN_RATE,
  ITEM_IDS,
  MAX_RUN_LENGTH,
  MIN_RUN_LENGTH,
} from './constants';
import type { Stair, Direction } from './types';

// Run-length weights: prefer 2-3 (most common), 1/4/5 less frequent.
const RUN_WEIGHTS = [0, 1, 3, 3, 2, 1]; // index 0 unused

function pickRunLength(rng: ReturnType<typeof createRng>): number {
  const total = RUN_WEIGHTS.reduce((a, b) => a + b, 0);
  const r = rng.next() * total;
  let acc = 0;
  for (let i = MIN_RUN_LENGTH; i <= MAX_RUN_LENGTH; i++) {
    acc += RUN_WEIGHTS[i];
    if (r < acc) return i;
  }
  return MAX_RUN_LENGTH;
}

export function generateStairs(seed: string, count: number): Stair[] {
  const rng = createRng(seed);
  const stairs: Stair[] = [];
  let dir: Direction = rng.next() < 0.5 ? 'L' : 'R';
  let remaining = pickRunLength(rng);
  let justSwitched = false;

  for (let floor = 1; floor <= count; floor++) {
    if (remaining === 0) {
      dir = dir === 'L' ? 'R' : 'L';
      remaining = pickRunLength(rng);
      justSwitched = true;
    }
    // Booster: base rate, +1.5x weight right after direction switch
    const boosterChance = BOOSTER_SPAWN_RATE * (justSwitched ? 1.5 : 1.0);
    const isBooster = rng.chance(boosterChance);
    const hasCoin = !isBooster && rng.chance(COIN_SPAWN_RATE);
    const hasFreeItem = !isBooster && !hasCoin && rng.chance(FREE_ITEM_SPAWN_RATE);
    const hasItem = hasFreeItem ? ITEM_IDS[rng.nextInt(0, ITEM_IDS.length - 1)] : undefined;

    stairs.push({ floor, dir, hasCoin, hasItem, isBooster });
    remaining--;
    justSwitched = false;
  }

  return stairs;
}
