import { COMBO_TIERS, COMBO_TIMEOUT_MS } from './constants';

export interface ComboState {
  combo: number;
  maxCombo: number;
  lastTapAt: number;          // ms; -1 = none
  shieldAvailable: boolean;
  speed: number;
  fever: boolean;
}

export function createComboState(): ComboState {
  return { combo: 0, maxCombo: 0, lastTapAt: -1, shieldAvailable: false, speed: 1.0, fever: false };
}

function applyTier(combo: number): { speed: number; shield: boolean; fever: boolean } {
  let result = { speed: 1.0, shield: false, fever: false };
  for (const t of COMBO_TIERS) {
    if (combo >= t.combo) result = { speed: t.speed, shield: !!t.shield, fever: 'fever' in t && t.fever === true };
  }
  return result;
}

export function onCorrectTap(s: ComboState, nowMs: number): ComboState {
  const combo = s.combo + 1;
  const tier = applyTier(combo);
  return {
    combo,
    maxCombo: Math.max(s.maxCombo, combo),
    lastTapAt: nowMs,
    shieldAvailable: tier.shield,
    speed: tier.speed,
    fever: tier.fever,
  };
}

export function onFail(s: ComboState): ComboState {
  if (s.shieldAvailable) {
    const tier = applyTier(s.combo);
    return { ...s, shieldAvailable: false, speed: tier.speed };
  }
  return { combo: 0, maxCombo: s.maxCombo, lastTapAt: -1, shieldAvailable: false, speed: 1.0, fever: false };
}

export function onTimeoutCheck(s: ComboState, nowMs: number): ComboState {
  if (s.lastTapAt < 0) return s;
  if (nowMs - s.lastTapAt >= COMBO_TIMEOUT_MS) {
    return { combo: 0, maxCombo: s.maxCombo, lastTapAt: -1, shieldAvailable: false, speed: 1.0, fever: false };
  }
  return s;
}
