import { eq } from 'drizzle-orm';
import { isValidItemId } from '@/shared/items-catalog';
import type { ItemId } from '@/shared/constants';
import * as schema from '../../drizzle/schema';

interface Ctx { redis: any; db: any; }

const EQUIPPED_TTL_SEC = 90;

export async function equipItems(
  ctx: Ctx,
  matchId: string,
  userId: string,
  slots: string[],
): Promise<void> {
  if (slots.length > 3) throw new Error('max 3 slots');
  for (const s of slots) if (!isValidItemId(s)) throw new Error(`unknown itemId: ${s}`);

  // Count how many of each item is needed
  const need: Record<string, number> = {};
  for (const s of slots) need[s] = (need[s] ?? 0) + 1;

  await ctx.db.transaction(async (tx: any) => {
    // Read current inventory for this user
    const rows: { userId: string; itemId: string; quantity: number }[] = await tx
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.userId, userId));

    const have: Record<string, number> = {};
    for (const r of rows) have[r.itemId] = r.quantity;

    // Validate sufficient stock
    for (const [iid, q] of Object.entries(need)) {
      if ((have[iid] ?? 0) < q) {
        throw new Error(`inventory insufficient: ${iid}`);
      }
    }

    // Decrement inventory via upsert — rows are guaranteed to exist (selected above),
    // so the conflict branch always fires. Avoids side-channel keys that break real Postgres.
    for (const [iid, q] of Object.entries(need)) {
      const newQty = (have[iid] ?? 0) - q;
      await tx.insert(schema.inventoryItems)
        .values({ userId, itemId: iid, quantity: newQty })
        .onConflictDoUpdate({
          target: [schema.inventoryItems.userId, schema.inventoryItems.itemId],
          set: { quantity: newQty },
        });
    }
  });

  // Write slots to Redis LIST (clear any previous equip first)
  const key = `match:equipped:${matchId}:${userId}`;
  await ctx.redis.del(key);
  if (slots.length > 0) await ctx.redis.rpush(key, ...slots);
  await ctx.redis.expire(key, EQUIPPED_TTL_SEC);
}

export async function getEquipped(
  ctx: Ctx,
  matchId: string,
  userId: string,
): Promise<ItemId[]> {
  const key = `match:equipped:${matchId}:${userId}`;
  const list = await ctx.redis.lrange(key, 0, -1);
  return list as ItemId[];
}
