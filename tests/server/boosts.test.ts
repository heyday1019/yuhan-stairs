import { describe, it, expect } from 'vitest';
import { getActiveBoosts, consumeBoosts, buyBoost } from '@/server/boosts';

// Minimal in-memory DB mock
function makeDb(users: any[], boosts: any[]) {
  const userBoostsStore = [...boosts];
  const usersStore = users.map(u => ({ ...u }));
  const transactions: any[] = [];

  const tx = {
    select: () => ({
      from: (t: any) => ({
        where: () => {
          // Detect drizzle table by its Symbol-based name; fall back to string check
          const name = t?.[Symbol.for('drizzle:BaseName')] ?? t;
          if (name === 'user_boosts') return Promise.resolve(userBoostsStore);
          return Promise.resolve(usersStore);
        },
      }),
    }),
    update: () => ({
      set: (vals: any) => ({
        where: () => {
          // apply first matching update
          if ('gamesRemaining' in vals) {
            const idx = userBoostsStore.findIndex(b => b.gamesRemaining > 0);
            if (idx >= 0) userBoostsStore[idx].gamesRemaining = vals.gamesRemaining;
          }
          if ('coins' in vals) usersStore[0].coins = vals.coins;
          if ('characterId' in vals) usersStore[0].characterId = vals.characterId;
          return Promise.resolve();
        },
      }),
    }),
    insert: () => ({
      values: (v: any) => {
        if ('boostType' in v) userBoostsStore.push({ id: 'new-id', ...v });
        if ('type' in v) transactions.push(v);
        return Promise.resolve();
      },
    }),
    delete: () => ({
      where: () => {
        const idx = userBoostsStore.findIndex(b => b.gamesRemaining <= 1);
        if (idx >= 0) userBoostsStore.splice(idx, 1);
        return Promise.resolve();
      },
    }),
  };

  return {
    _boosts: userBoostsStore,
    _users: usersStore,
    _transactions: transactions,
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(userBoostsStore),
      }),
    }),
    transaction: (cb: (tx: any) => Promise<any>) => cb(tx),
  };
}

describe('getActiveBoosts', () => {
  it('no boosts → empty array', async () => {
    const db = makeDb([], []);
    const result = await getActiveBoosts(db as any, 'u1');
    expect(result).toEqual([]);
  });

  it('has boosts → returns boostType array', async () => {
    const db = makeDb([], [
      { id: 'b1', userId: 'u1', boostType: 'beanstalk_up', gamesRemaining: 3 },
    ]);
    const result = await getActiveBoosts(db as any, 'u1');
    expect(result).toEqual(['beanstalk_up']);
  });
});

describe('consumeBoosts', () => {
  it('gamesRemaining=1 → row deleted', async () => {
    const db = makeDb([], [
      { id: 'b1', userId: 'u1', boostType: 'beanstalk_up', gamesRemaining: 1 },
    ]);
    await db.transaction(async (tx: any) => {
      // consumeBoosts is called inside a transaction
      await consumeBoosts(tx, 'u1');
    });
    expect(db._boosts.length).toBe(0);
  });

  it('gamesRemaining=3 → decremented to 2', async () => {
    const db = makeDb([], [
      { id: 'b1', userId: 'u1', boostType: 'beanstalk_up', gamesRemaining: 3 },
    ]);
    await db.transaction(async (tx: any) => {
      await consumeBoosts(tx, 'u1');
    });
    expect(db._boosts[0].gamesRemaining).toBe(2);
  });
});

describe('buyBoost', () => {
  it('insufficient coins → throws', async () => {
    const db = makeDb([{ id: 'u1', coins: 10 }], []);
    await expect(buyBoost(db as any, 'u1', 'beanstalk_up')).rejects.toThrow('insufficient coins');
  });

  it('unknown boostId → throws', async () => {
    const db = makeDb([{ id: 'u1', coins: 500 }], []);
    await expect(buyBoost(db as any, 'u1', 'nonexistent' as any)).rejects.toThrow();
  });

  it('normal purchase → coinsAfter correct, boost added', async () => {
    const db = makeDb([{ id: 'u1', coins: 100 }], []);
    const result = await buyBoost(db as any, 'u1', 'beanstalk_up'); // price=50
    expect(result.coinsAfter).toBe(50);
    expect(db._boosts.length).toBe(1);
    expect(db._boosts[0].gamesRemaining).toBe(3);
    expect(db._boosts[0].boostType).toBe('beanstalk_up');
  });
});
