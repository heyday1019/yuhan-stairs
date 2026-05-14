export const MODES = [100, 200, 300, 500, 800] as const;
export type Mode = typeof MODES[number];

export const ITEM_IDS = ['bomb', 'mine', 'beanstalk'] as const;
export type ItemId = typeof ITEM_IDS[number];

export const COIN_SPAWN_RATE = 0.12;
export const BOOSTER_SPAWN_RATE = 0.04;
export const FREE_ITEM_SPAWN_RATE = 0.02;

export const MAX_RUN_LENGTH = 5;
export const MIN_RUN_LENGTH = 1;

export const FAIL_PENALTY_FLOORS = 3;
export const COMBO_TIMEOUT_MS = 1200;

export const COMBO_TIERS = [
  { combo: 5,  speed: 1.10, shield: false },
  { combo: 10, speed: 1.25, shield: false },
  { combo: 20, speed: 1.40, shield: true  },
  { combo: 50, speed: 1.60, shield: true, fever: true },
] as const;

export const MODE_TIMEOUT_MS: Record<Mode, number> = {
  100: 3 * 60_000,
  200: 5 * 60_000,
  300: 7 * 60_000,
  500: 12 * 60_000,
  800: 18 * 60_000,
};

export const COIN_REWARDS: Record<Mode, { win: number; lose: number; botWin: number; botLose: number }> = {
  100: { win: 30,  lose: 5,  botWin: 10, botLose: 2 },
  200: { win: 50,  lose: 8,  botWin: 15, botLose: 3 },
  300: { win: 70,  lose: 12, botWin: 20, botLose: 5 },
  500: { win: 100, lose: 18, botWin: 30, botLose: 8 },
  800: { win: 150, lose: 25, botWin: 50, botLose: 12 },
};
