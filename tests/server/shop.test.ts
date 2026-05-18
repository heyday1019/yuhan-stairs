import { describe, it, expect } from 'vitest';
import { getCatalog, getInventoryFor } from '@/server/shop';

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
    expect(inv).toEqual({ bomb: 0, mine: 0, beanstalk: 0 });
  });

  it('getInventoryFor merges rows over zeros', async () => {
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([
        { itemId: 'bomb', quantity: 2 },
        { itemId: 'mine', quantity: 5 },
      ]) }) }),
    } as any;
    const inv = await getInventoryFor(fakeDb, 'user-1');
    expect(inv).toEqual({ bomb: 2, mine: 5, beanstalk: 0 });
  });
});
