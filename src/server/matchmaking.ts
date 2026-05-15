import type { RedisClient } from './redis';

const QUEUE_TTL_MS = 30_000;
const LOOKUP_TTL_S = 60;

export type EnqueueResult =
  | { status: 'queued' }
  | { status: 'already_in_match'; matchId: string }
  | { status: 'paired'; opponentUserId: string; role: 'A' | 'B' };

export async function tryEnqueue(r: RedisClient, userId: string, mode: number, nowMs: number): Promise<EnqueueResult> {
  const lookupKey = `match:lookup:${userId}`;
  const existing = await r.get(lookupKey);
  if (existing) return { status: 'already_in_match', matchId: existing };

  const queueKey = `queue:ranked:${mode}`;
  await r.zremrangebyscore(queueKey, '-inf', String(nowMs - QUEUE_TTL_MS));
  await r.zadd(queueKey, { score: nowMs, member: userId });

  const candidates = await r.zrange(queueKey, 0, 1);
  if (candidates.length < 2) return { status: 'queued' };

  const removedCount = await r.zrem(queueKey, candidates[0], candidates[1]);
  if (removedCount < 2) {
    return { status: 'queued' };
  }

  const opponentUserId = candidates[0] === userId ? candidates[1] : candidates[0];
  const role: 'A' | 'B' = candidates[0] === userId ? 'A' : 'B';
  return { status: 'paired', opponentUserId, role };
}

export async function tryCancel(r: RedisClient, userId: string, mode: number): Promise<boolean> {
  const removed = await r.zrem(`queue:ranked:${mode}`, userId);
  return removed > 0;
}

export async function setMatchLookup(r: RedisClient, userId: string, matchId: string): Promise<void> {
  await r.set(`match:lookup:${userId}`, matchId, { ex: LOOKUP_TTL_S });
}

export async function clearMatchLookup(r: RedisClient, userId: string): Promise<void> {
  await r.del(`match:lookup:${userId}`);
}
