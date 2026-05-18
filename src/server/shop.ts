import { eq, sql } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import { ITEMS_CATALOG, type ItemMeta, isValidItemId, getItemMeta } from '@/shared/items-catalog';
import type { ItemId } from '@/shared/constants';

type Db = { select: any };
type TxDb = { select: any; update: any; insert: any };

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

export async function buyItem(
  db: { transaction: (cb: (tx: TxDb) => Promise<any>) => Promise<any> },
  userId: string,
  itemId: string,
  qty: number,
): Promise<{ coinsAfter: number }> {
  if (!isValidItemId(itemId)) throw new Error(`unknown itemId: ${itemId}`);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error(`invalid qty: ${qty}`);

  const meta = getItemMeta(itemId as ItemId);
  const totalCost = meta.price * qty;

  return await db.transaction(async (tx: TxDb) => {
    const userRows = await tx.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!userRows.length) throw new Error('user not found');
    const current: number = userRows[0].coins ?? 0;
    if (current < totalCost) throw new Error('insufficient coins');

    await tx.update(schema.users)
      .set({ coins: current - totalCost })
      .where(eq(schema.users.id, userId));

    await tx.insert(schema.inventoryItems)
      .values({ userId, itemId, quantity: qty })
      .onConflictDoUpdate({
        target: [schema.inventoryItems.userId, schema.inventoryItems.itemId],
        set: { quantity: sql`${schema.inventoryItems.quantity} + ${qty}` },
      });

    await tx.insert(schema.transactions).values({
      userId,
      type: 'shop_purchase',
      deltaCoins: -totalCost,
      metadata: { itemId, qty },
    });

    return { coinsAfter: current - totalCost };
  });
}
