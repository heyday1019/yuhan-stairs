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

// ---------------------------------------------------------------------------
// useItem
// ---------------------------------------------------------------------------

const BOMB_RATE_LIMIT_MS = 10_000;
const MINE_REACH = 5;
const BEANSTALK_JUMP = 5;
const BOMB_FUSE_MS = 3000;
const BOMB_DURATION_MS = 1500;

interface ParsedMatchState {
  matchStartedAtMs: number;
  lastSeq: number;
  lastFloor: number;
  flaggedCount: number;
}

async function getMatchState(redis: any, matchId: string, userId: string): Promise<ParsedMatchState | null> {
  const stored = await redis.get(`match:state:${matchId}:${userId}`);
  if (!stored) return null;
  try { return JSON.parse(stored) as ParsedMatchState; } catch { return null; }
}

export type UseResult =
  | { kind: 'beanstalk'; userId: string; fromFloor: number; toFloor: number }
  | { kind: 'mine'; targetUserId: string; targetFloor: number }
  | { kind: 'bomb'; targetUserId: string; triggerAtMs: number; durationMs: number };

export async function useItem(
  ctx: Ctx,
  matchId: string,
  userId: string,
  opponentUserId: string,
  itemId: string,
  nowMs: number,
): Promise<UseResult> {
  if (!isValidItemId(itemId)) throw new Error(`unknown itemId: ${itemId}`);

  const equippedKey = `match:equipped:${matchId}:${userId}`;
  const equipped: string[] = await ctx.redis.lrange(equippedKey, 0, -1);
  if (!equipped.includes(itemId)) throw new Error('item not equipped');

  let result: UseResult;

  if (itemId === 'beanstalk') {
    const state = await getMatchState(ctx.redis, matchId, userId);
    const fromFloor = state?.lastFloor ?? 0;
    const toFloor = fromFloor + BEANSTALK_JUMP;
    result = { kind: 'beanstalk', userId, fromFloor, toFloor };
  } else if (itemId === 'mine') {
    const state = await getMatchState(ctx.redis, matchId, opponentUserId);
    const oppFloor = state?.lastFloor ?? 0;
    const targetFloor = oppFloor + 1 + Math.floor(Math.random() * MINE_REACH);
    result = { kind: 'mine', targetUserId: opponentUserId, targetFloor };
  } else {
    // bomb — rate limit
    const lastKey = `match:bomb_lastused:${matchId}:${userId}`;
    const lastStr = await ctx.redis.get(lastKey);
    if (lastStr) {
      const last = Number(lastStr);
      if (nowMs - last < BOMB_RATE_LIMIT_MS) throw new Error('bomb rate limit');
    }
    await ctx.redis.set(lastKey, String(nowMs), { ex: 15 });
    result = { kind: 'bomb', targetUserId: opponentUserId, triggerAtMs: nowMs + BOMB_FUSE_MS, durationMs: BOMB_DURATION_MS };
  }

  // Remove one occurrence of the used slot
  await ctx.redis.lrem(equippedKey, 1, itemId);

  return result;
}
