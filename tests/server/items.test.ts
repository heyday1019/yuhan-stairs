import { describe, it, expect } from 'vitest';
import { equipItems, getEquipped } from '@/server/items';
import { makeFakeRedis } from '../helpers/fake-redis';

// ---------------------------------------------------------------------------
// Fake-DB for items tests
// ---------------------------------------------------------------------------
// The impl calls:
//   tx.select().from(schema.inventoryItems).where(eq(userId))  → rows
//   tx.update(schema.inventoryItems).set({ quantity, _userId, _itemId }).where(...)
//
// We use _userId / _itemId as a side-channel so the fake can update the right row.
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

    update: (_table: any) => ({
      set: (vals: any) => ({
        where: (_cond: any) => {
          // Side-channel: impl passes _userId and _itemId alongside quantity
          if (vals._userId !== undefined && vals._itemId !== undefined) {
            const key = `${vals._userId}:${vals._itemId}`;
            inventory.set(key, vals.quantity);
          }
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
