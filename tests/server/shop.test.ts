import { describe, it, expect } from 'vitest';
import { buyCosmetic } from '@/server/shop';

function makeDb(users: any[]) {
  const store = users.map(u => ({ ...u }));
  const transactions: any[] = [];
  const tx = {
    select: () => ({ from: () => ({ where: () => Promise.resolve(store) }) }),
    update: () => ({ set: (v: any) => ({ where: () => { Object.assign(store[0], v); return Promise.resolve(); } }) }),
    insert: () => ({ values: (v: any) => { transactions.push(v); return Promise.resolve(); } }),
  };
  return { _users: store, transaction: (cb: any) => cb(tx) };
}

describe('buyCosmetic', () => {
  it('알 수 없는 characterId → 에러', async () => {
    const db = makeDb([{ id: 'u1', coins: 500, characterId: 'pink-beanie' }]);
    await expect(buyCosmetic(db as any, 'u1', 'nonexistent')).rejects.toThrow('unknown characterId');
  });
  it('이미 소유 → already owned', async () => {
    const db = makeDb([{ id: 'u1', coins: 500, characterId: 'pink-beanie' }]);
    await expect(buyCosmetic(db as any, 'u1', 'pink-beanie')).rejects.toThrow('already owned');
  });
  it('코인 부족 → insufficient coins', async () => {
    const db = makeDb([{ id: 'u1', coins: 100, characterId: 'pink-beanie' }]);
    await expect(buyCosmetic(db as any, 'u1', 'red-strawberry')).rejects.toThrow('insufficient coins');
  });
  it('정상 구매 → characterId 변경, 코인 차감', async () => {
    const db = makeDb([{ id: 'u1', coins: 500, characterId: 'pink-beanie' }]);
    const result = await buyCosmetic(db as any, 'u1', 'red-strawberry');
    expect(result.coinsAfter).toBe(300);
    expect(db._users[0].characterId).toBe('red-strawberry');
  });
  it('무료 코스메틱(pink-beanie) → 이미 기본값이라 already owned', async () => {
    const db = makeDb([{ id: 'u1', coins: 0, characterId: 'pink-beanie' }]);
    await expect(buyCosmetic(db as any, 'u1', 'pink-beanie')).rejects.toThrow('already owned');
  });
});
