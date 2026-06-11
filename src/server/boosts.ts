import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import { BOOSTS } from '@/shared/shop-catalog';
import type { BoostId } from '@/shared/shop-catalog';

export async function getActiveBoosts(db: any, userId: string): Promise<BoostId[]> {
  const rows = await db
    .select()
    .from(schema.userBoosts)
    .where(eq(schema.userBoosts.userId, userId));
  return rows.map((r: any) => r.boostType as BoostId);
}

export async function consumeBoosts(tx: any, userId: string): Promise<void> {
  const rows: any[] = await tx
    .select()
    .from(schema.userBoosts)
    .where(eq(schema.userBoosts.userId, userId));

  for (const row of rows) {
    if (row.gamesRemaining <= 1) {
      await tx.delete(schema.userBoosts).where(eq(schema.userBoosts.id, row.id));
    } else {
      await tx
        .update(schema.userBoosts)
        .set({ gamesRemaining: row.gamesRemaining - 1 })
        .where(eq(schema.userBoosts.id, row.id));
    }
  }
}

export async function buyBoost(
  db: any,
  userId: string,
  boostId: BoostId,
): Promise<{ coinsAfter: number }> {
  const meta = BOOSTS.find((b) => b.id === boostId);
  if (!meta) throw new Error(`unknown boostId: ${boostId}`);

  return db.transaction(async (tx: any) => {
    const [user] = await tx
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!user) throw new Error('user not found');
    if (user.coins < meta.price) throw new Error('insufficient coins');

    const coinsAfter = user.coins - meta.price;

    await tx
      .update(schema.users)
      .set({ coins: coinsAfter })
      .where(eq(schema.users.id, userId));

    await tx.insert(schema.userBoosts).values({
      userId,
      boostType: boostId,
      gamesRemaining: meta.games,
    });

    await tx.insert(schema.transactions).values({
      userId,
      type: 'shop_purchase',
      deltaCoins: -meta.price,
      metadata: { boostId },
    });

    return { coinsAfter };
  });
}
