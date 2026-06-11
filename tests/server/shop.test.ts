import { describe, it, expect } from 'vitest';
import { getCatalog, getInventoryFor, buyItem } from '@/server/shop';

describe('shop', () => {
  it('getCatalog returns 3 items with prices', () => {
    const list = getCatalog();
    expect(list).toHaveLength(3);
    expect(list.find((i) => i.id === 'bomb')?.price).toBe(80);
  });

  it('getInventoryFor returns zeros for fresh user', async () => {
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    } as any;
    const inv = await getInventoryFor(fakeDb, 'user-1');
    expect(inv).toEqual({ bomb: 0, mine: 0, beanstalk: 0, lightning: 0 });
  });

  it('getInventoryFor merges rows over zeros', async () => {
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([
        { itemId: 'bomb', quantity: 2 },
        { itemId: 'mine', quantity: 5 },
      ]) }) }),
    } as any;
    const inv = await getInventoryFor(fakeDb, 'user-1');
    expect(inv).toEqual({ bomb: 2, mine: 5, beanstalk: 0, lightning: 0 });
  });
});

// ---------------------------------------------------------------------------
// Fake-DB helper for buyItem
// ---------------------------------------------------------------------------
// Drizzle call shapes used by buyItem:
//   tx.select().from(schema.users).where(eq(...))               → Promise<row[]>
//   tx.update(schema.users).set({...}).where(eq(...))           → Promise<void>
//   tx.insert(schema.inventoryItems).values({...})
//       .onConflictDoUpdate({...})                              → Promise<void>
//   tx.insert(schema.transactions).values({...})                → Promise<void>

function makeFakeDb(seed: { user: { id: string; coins: number } }) {
  const users = new Map<string, { id: string; coins: number }>(
    [[seed.user.id, { ...seed.user }]],
  );
  const inventory = new Map<string, number>();   // key = "userId:itemId"
  const txns: any[] = [];

  // Build a fake transaction context that intercepts drizzle-like chains.
  const makeTx = () => ({
    // SELECT chain: select().from(table).where(cond) → Promise<rows>
    select: () => ({
      from: (table: any) => ({
        where: (_cond: any) => {
          // Only users table is SELECTed in buyItem.
          // We return the current user row(s).
          const rows = Array.from(users.values());
          return Promise.resolve(rows);
        },
      }),
    }),

    // UPDATE chain: update(table).set(patch).where(cond) → Promise<void>
    update: (_table: any) => ({
      set: (patch: Record<string, any>) => ({
        where: (_cond: any) => {
          // Apply the patch to every user in the map (single-user scenario).
          for (const [id, u] of users) {
            users.set(id, { ...u, ...patch });
          }
          return Promise.resolve();
        },
      }),
    }),

    // INSERT chain:
    //   insert(table).values(data)                          → Promise<void>  (transactions table)
    //   insert(table).values(data).onConflictDoUpdate({})  → Promise<void>  (inventoryItems table)
    insert: (_table: any) => ({
      values: (data: any) => {
        // Peek: if data has a deltaCoins field → it's a transaction row.
        // If data has itemId + quantity → it's an inventoryItems row.
        // We return a thenable that resolves immediately (for the transactions case)
        // AND exposes onConflictDoUpdate (for the inventoryItems case).

        const thenable = {
          // Allow direct await (transactions insert)
          then(resolve: any, reject: any) {
            try {
              // transactions insert
              if ('deltaCoins' in data) {
                txns.push({ ...data });
              }
              resolve(undefined);
            } catch (e) {
              reject(e);
            }
            return Promise.resolve(undefined);
          },

          // inventoryItems upsert
          onConflictDoUpdate: (_opts: any) => {
            const key = `${data.userId}:${data.itemId}`;
            const existing = inventory.get(key) ?? 0;
            inventory.set(key, existing + data.quantity);
            return Promise.resolve();
          },
        };
        return thenable;
      },
    }),
  });

  // The db.transaction(cb) wrapper
  const fakeDb = {
    transaction: async (cb: (tx: any) => Promise<any>) => {
      return cb(makeTx());
    },
    // Also expose the flat API for any top-level calls (not used by buyItem but safe to include)
    ...makeTx(),
  };

  return { db: fakeDb, users, inventory, txns };
}

// ---------------------------------------------------------------------------
// buyItem tests
// ---------------------------------------------------------------------------
describe('shop.buyItem', () => {
  it('rejects when balance insufficient', async () => {
    const { db } = makeFakeDb({ user: { id: 'u1', coins: 10 } });
    await expect(buyItem(db, 'u1', 'bomb', 1))
      .rejects.toThrow(/insufficient|coin/i);
  });

  it('debits coins, increments inventory, inserts transaction', async () => {
    const { db, users, inventory, txns } = makeFakeDb({ user: { id: 'u1', coins: 100 } });
    await buyItem(db, 'u1', 'mine', 2);  // 30 * 2 = 60
    expect(users.get('u1')!.coins).toBe(40);
    expect(inventory.get('u1:mine')).toBe(2);
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ userId: 'u1', deltaCoins: -60, type: 'shop_purchase' });
  });

  it('rejects negative qty', async () => {
    const { db } = makeFakeDb({ user: { id: 'u1', coins: 100 } });
    await expect(buyItem(db, 'u1', 'bomb', -1)).rejects.toThrow(/qty/i);
  });

  it('rejects unknown itemId', async () => {
    const { db } = makeFakeDb({ user: { id: 'u1', coins: 100 } });
    await expect(buyItem(db, 'u1', 'foo' as any, 1)).rejects.toThrow(/itemId/i);
  });
});
