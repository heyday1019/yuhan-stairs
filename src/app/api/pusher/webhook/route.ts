import { NextRequest, NextResponse } from 'next/server';
import { getPusher } from '@/server/pusher';
import { getRedis, type RedisClient } from '@/server/redis';
import { db, schema } from '@/server/db';
import { eq } from 'drizzle-orm';

interface WebhookEvent {
  name: 'channel_occupied' | 'member_added' | 'member_removed' | string;
  channel: string;
  user_id?: string;
}

const COUNTDOWN_MS = 3000;
const START_TTL_S = 30;
const DISCONNECT_TTL_S = 12;

// Triggers (or re-broadcasts) match_start on a presence-match channel.
// Called on both channel_occupied (first subscriber) and member_added (each
// later subscriber), so a client that completes its subscription handshake
// after the first trigger fired still receives the event. Idempotent: the
// startAtMs is cached in Redis under NX, and the client guards against
// re-running init.
async function triggerMatchStart(r: RedisClient, matchId: string): Promise<void> {
  const startKey = `match:start:${matchId}`;
  let startAtMsStr = await r.get(startKey);
  let startAtMs: number;
  let firstTime = false;
  if (!startAtMsStr) {
    startAtMs = Date.now() + COUNTDOWN_MS;
    const set = await r.set(startKey, String(startAtMs), { ex: START_TTL_S, nx: true });
    if (set === 'OK') {
      firstTime = true;
    } else {
      // Lost the NX race. Re-read the value that won.
      startAtMsStr = await r.get(startKey);
      if (!startAtMsStr) return;
      startAtMs = Number(startAtMsStr);
    }
  } else {
    startAtMs = Number(startAtMsStr);
  }

  const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
  if (!match) return;

  if (firstTime) {
    await db.update(schema.matches).set({
      status: 'active',
      matchStartedAt: new Date(startAtMs),
    }).where(eq(schema.matches.id, matchId));
  }

  await getPusher().trigger(`presence-match-${matchId}`, 'match_start', {
    startAtMs, seed: match.stairSeed, mode: match.mode,
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const key = req.headers.get('x-pusher-key') ?? '';
  const signature = req.headers.get('x-pusher-signature') ?? '';
  if (!getPusher().verifyWebhook({ key, signature }, rawBody)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events: WebhookEvent[] };
  const r = getRedis();
  const pusher = getPusher();

  for (const ev of body.events) {
    const matchMatch = ev.channel.match(/^presence-match-(.+)$/);
    if (!matchMatch) continue;
    const matchId = matchMatch[1];

    if (ev.name === 'channel_occupied') {
      await triggerMatchStart(r, matchId);
    } else if (ev.name === 'member_removed' && ev.user_id) {
      await r.set(`match:disconnect:${matchId}:${ev.user_id}`, String(Date.now()), { ex: DISCONNECT_TTL_S });
    } else if (ev.name === 'member_added' && ev.user_id) {
      // Re-broadcast match_start so a late subscriber (who joined after the
      // initial channel_occupied trigger) receives the event.
      await triggerMatchStart(r, matchId);
      const dKey = `match:disconnect:${matchId}:${ev.user_id}`;
      const had = await r.get(dKey);
      if (had) {
        await r.del(dKey);
        await pusher.trigger(`presence-match-${matchId}`, 'opponent_resumed', { userId: ev.user_id });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
