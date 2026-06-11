import { describe, it, expect, beforeEach } from 'vitest';
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

describe('store M3 receive-side actions', () => {
  it('applyMine pushes floor onto mines', () => {
    useGame.getState().applyMine(42);
    expect(useGame.getState().mines).toEqual([42]);
  });

  it('applyBomb sets bombActiveUntilMs = atMs + durationMs', () => {
    useGame.getState().applyBomb(10_000, 1500);
    expect(useGame.getState().bombActiveUntilMs).toBe(11_500);
  });

  it('applyBeanstalkJump records the jump anchor', () => {
    useGame.getState().applyBeanstalkJump(10, 15, 5000);
    expect(useGame.getState().beanstalkJumpAt).toEqual({ fromFloor: 10, toFloor: 15, atMs: 5000 });
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
