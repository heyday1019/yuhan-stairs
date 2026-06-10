import { eq, and } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import type { RedisClient } from './redis';
import type { PusherServer } from './pusher';

type Db = { select: any };

export async function sendEmoji(
  deps: { db: Db; redis: RedisClient; pusher: PusherServer },
  matchId: string,
  userId: string,
  emoji: string,
): Promise<{ ok: true } | { error: string; status: number }> {
  const rows = await deps.db
    .select()
    .from(schema.matchParticipants)
    .where(
      and(
        eq(schema.matchParticipants.matchId, matchId),
        eq(schema.matchParticipants.userId, userId),
      ),
    );
  if (!rows.length) return { error: 'not a participant', status: 403 };

  const cooldownKey = `match:emoji_cooldown:${matchId}:${userId}`;
  const set = await deps.redis.set(cooldownKey, '1', { ex: 5, nx: true });
  if (set === null) return { error: 'rate limited', status: 429 };

  await deps.pusher.trigger(`presence-match-${matchId}`, 'emoji_sent', { userId, emoji });
  return { ok: true };
}
