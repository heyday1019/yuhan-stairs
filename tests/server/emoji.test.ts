import { describe, it, expect } from 'vitest';
import { sendEmoji } from '@/server/emoji';
import { makeFakeRedis } from '../helpers/fake-redis';
import type { PusherServer } from '@/server/pusher';

function makeFakePusher() {
  const calls: { channel: string; event: string; data: unknown }[] = [];
  const server: PusherServer = {
    trigger: async (channel, event, data) => { calls.push({ channel, event, data }); },
    authorizeChannel: () => ({ auth: '' }),
    verifyWebhook: () => true,
  };
  return { server, calls };
}

function makeFakeDb(participantUserId: string | null) {
  return {
    select: () => ({
      from: (_t: unknown) => ({
        where: (_c: unknown) =>
          Promise.resolve(participantUserId ? [{ userId: participantUserId }] : []),
      }),
    }),
  };
}

describe('sendEmoji', () => {
  it('returns 403 when userId is not a match participant', async () => {
    const redis = makeFakeRedis();
    const { server } = makeFakePusher();
    const db = makeFakeDb(null);
    const result = await sendEmoji(
      { db: db as any, redis, pusher: server },
      'm1', 'u1', '😂',
    );
    expect(result).toMatchObject({ error: 'not a participant', status: 403 });
  });

  it('returns 429 when called twice within the cooldown window', async () => {
    const redis = makeFakeRedis();
    const { server } = makeFakePusher();
    const db = makeFakeDb('u1');
    await sendEmoji({ db: db as any, redis, pusher: server }, 'm1', 'u1', '😂');
    const result = await sendEmoji({ db: db as any, redis, pusher: server }, 'm1', 'u1', '🔥');
    expect(result).toMatchObject({ error: 'rate limited', status: 429 });
  });

  it('broadcasts emoji_sent to the correct Pusher channel', async () => {
    const redis = makeFakeRedis();
    const { server, calls } = makeFakePusher();
    const db = makeFakeDb('u1');
    const result = await sendEmoji({ db: db as any, redis, pusher: server }, 'm1', 'u1', '🔥');
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      channel: 'presence-match-m1',
      event: 'emoji_sent',
      data: { userId: 'u1', emoji: '🔥' },
    });
  });

  it('allows a second send after the cooldown key is removed', async () => {
    const redis = makeFakeRedis();
    const { server, calls } = makeFakePusher();
    const db = makeFakeDb('u1');
    await sendEmoji({ db: db as any, redis, pusher: server }, 'm1', 'u1', '😂');
    await redis.del('match:emoji_cooldown:m1:u1');
    const result = await sendEmoji({ db: db as any, redis, pusher: server }, 'm1', 'u1', '👏');
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });
});
