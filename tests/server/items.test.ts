import { describe, it, expect } from 'vitest';
import { equipItems, getEquipped, useItem } from '@/server/items';
import { makeFakeRedis } from '../helpers/fake-redis';

// ---------------------------------------------------------------------------
// Fake-DB for items tests
// ---------------------------------------------------------------------------
// The impl calls:
//   tx.select().from(schema.inventoryItems).where(eq(userId))  → rows
//   tx.insert(schema.inventoryItems).values({ userId, itemId, quantity })
//     .onConflictDoUpdate({ target: [...], set: { quantity } })
// ---------------------------------------------------------------------------

function makeFakeDb(seed: { inventory: Record<string, number> }) {
  // inventory key = "userId:itemId"
  const inventory = new Map(Object.entries(seed.inventory));

  const makeTx = () => ({
    select: () => ({
      from: (_table: any) => ({
        where: (_cond: any) => {
          // Return all rows — equipItems filters by userId anyway
          const out: { userId: string; itemId: string; quantity: number }[] = [];
          for (const [k, q] of inventory) {
            const [uid, iid] = k.split(':');
            out.push({ userId: uid, itemId: iid, quantity: q });
          }
          return Promise.resolve(out);
        },
      }),
    }),

    insert: (_table: any) => ({
      values: (vals: any) => ({
        onConflictDoUpdate: (_opts: any) => {
          const k = `${vals.userId}:${vals.itemId}`;
          inventory.set(k, vals.quantity);  // set absolute quantity
          return Promise.resolve();
        },
      }),
    }),
  });

  return {
    inventory,
    transaction: async (fn: any) => fn(makeTx()),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('items.equipItems', () => {
  it('writes slots to redis when inventory sufficient', async () => {
    const redis = makeFakeRedis();
    const db = makeFakeDb({ inventory: { 'u1:bomb': 1, 'u1:mine': 2 } });
    await equipItems({ redis, db } as any, 'm1', 'u1', ['bomb', 'mine']);
    expect(await redis.lrange('match:equipped:m1:u1', 0, -1)).toEqual(['bomb', 'mine']);
  });

  it('rejects when slot count > 3', async () => {
    const redis = makeFakeRedis();
    const db = makeFakeDb({ inventory: {} });
    await expect(
      equipItems({ redis, db } as any, 'm1', 'u1', ['bomb', 'mine', 'beanstalk', 'mine']),
    ).rejects.toThrow(/3/);
  });

  it('rejects when inventory insufficient', async () => {
    const redis = makeFakeRedis();
    const db = makeFakeDb({ inventory: { 'u1:bomb': 0 } });
    await expect(
      equipItems({ redis, db } as any, 'm1', 'u1', ['bomb']),
    ).rejects.toThrow(/inventory/i);
  });

  it('decrements inventory in db', async () => {
    const redis = makeFakeRedis();
    const db = makeFakeDb({ inventory: { 'u1:mine': 3 } });
    await equipItems({ redis, db } as any, 'm1', 'u1', ['mine', 'mine']);
    expect(db.inventory.get('u1:mine')).toBe(1);
  });
});

describe('items.getEquipped', () => {
  it('returns empty array when nothing equipped', async () => {
    const redis = makeFakeRedis();
    const db = makeFakeDb({ inventory: {} });
    const result = await getEquipped({ redis, db } as any, 'm1', 'u1');
    expect(result).toEqual([]);
  });

  it('returns slots previously equipped', async () => {
    const redis = makeFakeRedis();
    const db = makeFakeDb({ inventory: { 'u1:bomb': 2 } });
    await equipItems({ redis, db } as any, 'm1', 'u1', ['bomb', 'bomb']);
    const result = await getEquipped({ redis, db } as any, 'm1', 'u1');
    expect(result).toEqual(['bomb', 'bomb']);
  });
});

describe('items.useItem', () => {
  it('beanstalk returns toFloor = currentFloor + 5', async () => {
    const redis = makeFakeRedis();
    await redis.rpush('match:equipped:m1:u1', 'beanstalk');
    await redis.set('match:state:m1:u1', JSON.stringify({
      matchStartedAtMs: 0, lastSeq: 20, lastFloor: 12, flaggedCount: 0,
    }));
    const res = await useItem({ redis } as any, 'm1', 'u1', 'u2', 'beanstalk', Date.now());
    expect(res).toMatchObject({ kind: 'beanstalk', fromFloor: 12, toFloor: 17 });
    expect(await redis.lrange('match:equipped:m1:u1', 0, -1)).toEqual([]);
  });

  it('mine picks targetFloor in [opp+1, opp+5]', async () => {
    const redis = makeFakeRedis();
    await redis.rpush('match:equipped:m1:u1', 'mine');
    await redis.set('match:state:m1:u2', JSON.stringify({
      matchStartedAtMs: 0, lastSeq: 0, lastFloor: 40, flaggedCount: 0,
    }));
    const res = await useItem({ redis } as any, 'm1', 'u1', 'u2', 'mine', Date.now());
    expect(res.kind).toBe('mine');
    expect((res as any).targetFloor).toBeGreaterThanOrEqual(41);
    expect((res as any).targetFloor).toBeLessThanOrEqual(45);
  });

  it('bomb returns triggerAtMs = now + 3000', async () => {
    const redis = makeFakeRedis();
    await redis.rpush('match:equipped:m1:u1', 'bomb');
    const now = 1_000_000;
    const res = await useItem({ redis } as any, 'm1', 'u1', 'u2', 'bomb', now);
    expect(res).toMatchObject({ kind: 'bomb', triggerAtMs: now + 3000, durationMs: 1500 });
  });

  it('rejects use when slot not equipped', async () => {
    const redis = makeFakeRedis();
    await expect(useItem({ redis } as any, 'm1', 'u1', 'u2', 'bomb', Date.now()))
      .rejects.toThrow(/equipped/);
  });

  it('rejects bomb within 10s of previous bomb (rate limit)', async () => {
    const redis = makeFakeRedis();
    await redis.rpush('match:equipped:m1:u1', 'bomb', 'bomb');
    const now = 1_000_000;
    await useItem({ redis } as any, 'm1', 'u1', 'u2', 'bomb', now);
    await expect(useItem({ redis } as any, 'm1', 'u1', 'u2', 'bomb', now + 5000))
      .rejects.toThrow(/rate/i);
  });

  it('removes used slot from equipped (lrem)', async () => {
    const redis = makeFakeRedis();
    await redis.rpush('match:equipped:m1:u1', 'mine', 'bomb');
    await redis.set('match:state:m1:u2', JSON.stringify({
      matchStartedAtMs: 0, lastSeq: 0, lastFloor: 5, flaggedCount: 0,
    }));
    await useItem({ redis } as any, 'm1', 'u1', 'u2', 'mine', Date.now());
    expect(await redis.lrange('match:equipped:m1:u1', 0, -1)).toEqual(['bomb']);
  });
});
