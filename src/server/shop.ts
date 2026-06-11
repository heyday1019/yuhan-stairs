import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import { COSMETICS } from '@/shared/shop-catalog';

type TxDb = { select: any; update: any; insert: any };

export async function buyCosmetic(
  db: { transaction: (cb: (tx: TxDb) => Promise<any>) => Promise<any> },
  userId: string,
  characterId: string,
): Promise<{ coinsAfter: number }> {
  const meta = COSMETICS.find((c) => c.characterId === characterId);
  if (!meta) throw new Error(`unknown characterId: ${characterId}`);

  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!user) throw new Error('user not found');
    if (user.characterId === characterId) throw new Error('already owned');
    if (user.coins < meta.price) throw new Error('insufficient coins');

    const coinsAfter = user.coins - meta.price;

    await tx.update(schema.users)
      .set({ coins: coinsAfter, characterId })
      .where(eq(schema.users.id, userId));

    if (meta.price > 0) {
      await tx.insert(schema.transactions).values({
        userId, type: 'shop_purchase', deltaCoins: -meta.price, metadata: { characterId },
      });
    }
    return { coinsAfter };
  });
}
