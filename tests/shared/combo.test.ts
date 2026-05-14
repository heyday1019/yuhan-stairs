import { describe, it, expect } from 'vitest';
import { createComboState, onCorrectTap, onFail, onTimeoutCheck } from '@/shared/combo';

describe('combo state', () => {
  it('starts at 0', () => {
    expect(createComboState().combo).toBe(0);
  });

  it('increments on correct tap', () => {
    const s = createComboState();
    const a = onCorrectTap(s, 100);
    expect(a.combo).toBe(1);
    const b = onCorrectTap(a, 200);
    expect(b.combo).toBe(2);
  });

  it('returns max combo across the session', () => {
    let s = createComboState();
    for (let i = 0; i < 10; i++) s = onCorrectTap(s, i * 100);
    s = onFail(s);
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(10);
  });

  it('shield consumed at combo>=20 absorbs one fail without resetting combo', () => {
    let s = createComboState();
    for (let i = 0; i < 20; i++) s = onCorrectTap(s, i * 100);
    expect(s.combo).toBe(20);
    expect(s.shieldAvailable).toBe(true);

    s = onFail(s);                             // shield absorbs
    expect(s.combo).toBe(20);
    expect(s.shieldAvailable).toBe(false);

    s = onFail(s);                             // real reset
    expect(s.combo).toBe(0);
  });

  it('resets after 1200ms of inactivity via onTimeoutCheck', () => {
    let s = createComboState();
    s = onCorrectTap(s, 1000);
    s = onTimeoutCheck(s, 1000 + 1199);
    expect(s.combo).toBe(1);
    s = onTimeoutCheck(s, 1000 + 1200);
    expect(s.combo).toBe(0);
  });

  it('exposes current speed multiplier per tier', () => {
    let s = createComboState();
    expect(s.speed).toBe(1.0);
    for (let i = 0; i < 5; i++) s = onCorrectTap(s, i * 100);
    expect(s.speed).toBe(1.10);
    for (let i = 0; i < 5; i++) s = onCorrectTap(s, 1000 + i * 100);
    expect(s.speed).toBe(1.25);
  });
});
