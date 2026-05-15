import { describe, it, expect, beforeEach } from 'vitest';
import { tryEnqueue, tryCancel } from '@/server/matchmaking';
import { makeFakeRedis } from '../helpers/fake-redis';
import type { RedisClient } from '@/server/redis';

let r: RedisClient;
beforeEach(() => { r = makeFakeRedis(); });

describe('tryEnqueue', () => {
  it('빈 큐에 한 명 → queued', async () => {
    const result = await tryEnqueue(r, 'u1', 100, 1000);
    expect(result.status).toBe('queued');
  });

  it('동일 user 재진입 → 활성 매치 ID 반환', async () => {
    await r.set('match:lookup:u1', 'm-existing', { ex: 60 });
    const result = await tryEnqueue(r, 'u1', 100, 1000);
    expect(result).toEqual({ status: 'already_in_match', matchId: 'm-existing' });
  });

  it('두 user 순차 enqueue → 두 번째에서 paired', async () => {
    const a = await tryEnqueue(r, 'u1', 100, 1000);
    expect(a.status).toBe('queued');
    const b = await tryEnqueue(r, 'u2', 100, 1100);
    expect(b.status).toBe('paired');
    if (b.status === 'paired') {
      expect(b.opponentUserId).toBe('u1');
      expect(b.role).toBe('B');
    }
  });

  it('3명 대기 시 정확히 한 페어만 (먼저 들어온 둘)', async () => {
    await tryEnqueue(r, 'u1', 100, 1000);
    await tryEnqueue(r, 'u2', 100, 1100);
    const c = await tryEnqueue(r, 'u3', 100, 1200);
    expect(c.status).toBe('queued');
  });

  it('30s 이전 stale 항목은 큐 청소', async () => {
    await r.zadd('queue:ranked:100', { score: 0, member: 'stale' });
    await tryEnqueue(r, 'u1', 100, 60_000);
    const remaining = await r.zrange('queue:ranked:100', 0, -1);
    expect(remaining).not.toContain('stale');
    expect(remaining).toContain('u1');
  });
});

describe('tryCancel', () => {
  it('큐에서 제거', async () => {
    await tryEnqueue(r, 'u1', 100, 1000);
    const ok = await tryCancel(r, 'u1', 100);
    expect(ok).toBe(true);
    expect(await r.zrange('queue:ranked:100', 0, -1)).toEqual([]);
  });
});
