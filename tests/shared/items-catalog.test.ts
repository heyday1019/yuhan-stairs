import { describe, it, expect } from 'vitest';
import { ITEMS_CATALOG, getItemMeta } from '@/shared/items-catalog';

describe('items-catalog', () => {
  it('returns three items', () => {
    expect(ITEMS_CATALOG).toHaveLength(3);
    expect(ITEMS_CATALOG.map((i) => i.id).sort()).toEqual(['beanstalk', 'bomb', 'mine']);
  });

  it('exposes prices matching spec', () => {
    expect(getItemMeta('bomb').price).toBe(80);
    expect(getItemMeta('mine').price).toBe(30);
    expect(getItemMeta('beanstalk').price).toBe(50);
  });

  it('throws on unknown id', () => {
    expect(() => getItemMeta('unknown' as any)).toThrow();
  });
});
