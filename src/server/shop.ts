import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import { ITEMS_CATALOG, type ItemMeta } from '@/shared/items-catalog';
import type { ItemId } from '@/shared/constants';

type Db = { select: any };

export function getCatalog(): readonly ItemMeta[] {
  return ITEMS_CATALOG;
}

export async function getInventoryFor(db: Db, userId: string): Promise<Record<ItemId, number>> {
  const rows = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.userId, userId));
  const out: Record<ItemId, number> = { bomb: 0, mine: 0, beanstalk: 0 };
  for (const r of rows) {
    if (r.itemId in out) out[r.itemId as ItemId] = r.quantity;
  }
  return out;
}
