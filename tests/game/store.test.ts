import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGame } from '@/game/store';
import type { Stair } from '@/shared/types';

function flatStairs(n: number): Stair[] {
  return Array.from({ length: n }, (_, i) => ({
    floor: i + 1, dir: i % 2 === 0 ? 'L' : 'R', x: 0, hasCoin: false, isBooster: false,
  }));
}

beforeEach(() => {
  useGame.getState().init({ matchId: 'm1', goalFloor: 100, stairs: flatStairs(100), botDifficulty: 'normal' });
});

describe('store M3 fields and actions', () => {
  it('arms shield with 1500ms window', () => {
    useGame.getState().armShield(1000);
    expect(useGame.getState().shieldArmedUntilMs).toBe(2500);
    expect(useGame.getState().shieldConsumed).toBe(false);
  });

  it('applyMine pushes floor onto mines', () => {
    useGame.getState().applyMine(42);
    expect(useGame.getState().mines).toEqual([42]);
  });

  it('applyItemPicked fills the requested empty slot', () => {
    useGame.getState().setEquippedSlots(['bomb', null, null]);
    useGame.getState().applyItemPicked('mine', 1);
    expect(useGame.getState().equippedSlots).toEqual(['bomb', 'mine', null]);
  });

  it('applyItemPicked is a no-op when slot already filled', () => {
    useGame.getState().setEquippedSlots(['bomb', 'bomb', null]);
    useGame.getState().applyItemPicked('mine', 1);
    expect(useGame.getState().equippedSlots).toEqual(['bomb', 'bomb', null]);
  });

  it('applyBomb sets bombActiveUntilMs = atMs + durationMs', () => {
    useGame.getState().applyBomb(10_000, 1500);
    expect(useGame.getState().bombActiveUntilMs).toBe(11_500);
  });

  it('applyBeanstalkJump records the jump anchor', () => {
    useGame.getState().applyBeanstalkJump(10, 15, 5000);
    expect(useGame.getState().beanstalkJumpAt).toEqual({ fromFloor: 10, toFloor: 15, atMs: 5000 });
  });

  it('consumeShield flips shieldConsumed to true', () => {
    useGame.getState().armShield(1000);
    useGame.getState().consumeShield();
    expect(useGame.getState().shieldConsumed).toBe(true);
  });

  it('consumePendingTickEvent returns and clears the queued event', () => {
    useGame.setState({ pendingTickEvent: 'mine_hit' });
    expect(useGame.getState().consumePendingTickEvent()).toBe('mine_hit');
    expect(useGame.getState().pendingTickEvent).toBeNull();
    expect(useGame.getState().consumePendingTickEvent()).toBeNull();
  });
});

describe('store handleTap mine interaction', () => {
  it('stepping on a mine locks input 1000ms and queues mine_hit', () => {
    useGame.setState({ playerFloor: 0, matchStartAtMs: 0, mines: [1] });
    const stairs = flatStairs(100);
    useGame.setState({ stairs });
    useGame.getState().handleTap(stairs[0].dir, 5_000);
    const s = useGame.getState();
    expect(s.playerFloor).toBe(1);
    expect(s.inputLockedUntil).toBe(6_000);
    expect(s.mines).toEqual([]);
    expect(s.pendingTickEvent).toBe('mine_hit');
  });
});

describe('store handleTap shield interaction', () => {
  it('shield within window absorbs a fail without penalty', () => {
    const stairs = flatStairs(100);
    useGame.setState({ stairs, matchStartAtMs: 0, playerFloor: 5 });
    // Force combo >= 20 and arm shield in the same window.
    useGame.setState({
      combo: { combo: 22, maxCombo: 22, lastTapAt: 1000, shieldAvailable: true, speed: 1.0, fever: false },
      shieldArmedUntilMs: 2500,
      shieldConsumed: false,
    });
    const wrongDir = stairs[5].dir === 'L' ? 'R' : 'L';
    useGame.getState().handleTap(wrongDir, 2000);
    const s = useGame.getState();
    expect(s.playerFloor).toBe(5);
    expect(s.failCount).toBe(0);
    expect(s.shieldConsumed).toBe(true);
    expect(s.pendingTickEvent).toBe('shield_used');
  });

  it('shield outside window does not absorb the fail', () => {
    const stairs = flatStairs(100);
    useGame.setState({ stairs, matchStartAtMs: 0, playerFloor: 5 });
    useGame.setState({
      combo: { combo: 22, maxCombo: 22, lastTapAt: 1000, shieldAvailable: true, speed: 1.0, fever: false },
      shieldArmedUntilMs: 1500,
      shieldConsumed: false,
    });
    const wrongDir = stairs[5].dir === 'L' ? 'R' : 'L';
    useGame.getState().handleTap(wrongDir, 5000);
    const s = useGame.getState();
    expect(s.playerFloor).toBeLessThan(5);
    expect(s.failCount).toBe(1);
    expect(s.combo.combo).toBe(0);
  });
});

describe('store useSlot', () => {
  it('beanstalk response jumps playerFloor and queues beanstalk_use', async () => {
    const fakeFetch = vi.fn(async () => new Response(
      JSON.stringify({ ok: true, result: { kind: 'beanstalk', userId: 'u1', fromFloor: 10, toFloor: 15 } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fakeFetch);
    vi.stubGlobal('localStorage', {
      getItem: () => 'device-uuid-1',
      setItem: () => {},
      removeItem: () => {},
    });
    useGame.setState({
      matchId: 'm1',
      equippedSlots: ['beanstalk', null, null],
      playerFloor: 10,
    });
    await useGame.getState().useSlot(0);
    const s = useGame.getState();
    expect(s.playerFloor).toBe(15);
    expect(s.equippedSlots[0]).toBeNull();
    expect(s.beanstalkJumpAt).toMatchObject({ fromFloor: 10, toFloor: 15 });
    expect(s.pendingTickEvent).toBe('beanstalk_use');
  });

  it('rolls back slot when server returns error', async () => {
    const fakeFetch = vi.fn(async () => new Response(
      JSON.stringify({ error: 'item not equipped' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fakeFetch);
    vi.stubGlobal('localStorage', {
      getItem: () => 'device-uuid-1',
      setItem: () => {},
      removeItem: () => {},
    });
    useGame.setState({
      matchId: 'm1',
      equippedSlots: ['bomb', null, null],
    });
    await useGame.getState().useSlot(0);
    expect(useGame.getState().equippedSlots[0]).toBe('bomb');
  });
});
