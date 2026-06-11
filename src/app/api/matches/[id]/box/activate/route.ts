import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db, schema } from '@/server/db';
import { getRedis } from '@/server/redis';
import { getPusher } from '@/server/pusher';
import { MINE_REACH, BOMB_FUSE_MS, BOMB_DURATION_MS, LIGHTNING_DURATION_MS } from '@/shared/constants';

const BOX_RATE_LIMIT_TTL_S = 3;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await ctx.params;
    const user = await getCurrentUserFromHeaders(req.headers);
    const body = await req.json().catch(() => ({}));
    const itemId: unknown = body?.itemId;

    if (typeof itemId !== 'string' || !['bomb', 'mine', 'lightning'].includes(itemId)) {
      return NextResponse.json({ error: 'invalid itemId' }, { status: 400 });
    }

    const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
    if (!match || match.status !== 'active') {
      return NextResponse.json({ error: 'match not active' }, { status: 400 });
    }

    const parts = await db.select().from(schema.matchParticipants).where(eq(schema.matchParticipants.matchId, matchId));
    const me = parts.find((p) => p.userId === user.id);
    if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const opp = parts.find((p) => p.userId && p.userId !== user.id);
    if (!opp?.userId) return NextResponse.json({ error: 'no opponent' }, { status: 400 });

    const r = getRedis();
    const rateKey = `match:box_activate:${matchId}:${user.id}:${itemId}`;
    const ok = await r.set(rateKey, '1', { ex: BOX_RATE_LIMIT_TTL_S, nx: true });
    if (ok !== 'OK') return NextResponse.json({ error: 'rate limited' }, { status: 429 });

    const pusher = getPusher();
    const channel = `presence-match-${matchId}`;
    const nowMs = Date.now();

    if (itemId === 'mine') {
      const stateKey = `match:state:${matchId}:${opp.userId}`;
      const stored = await r.get(stateKey);
      let oppState: { lastFloor?: number } = { lastFloor: 0 };
      try {
        if (stored) oppState = JSON.parse(stored);
      } catch {
        // malformed state → treat as floor 0
      }
      const oppFloor = oppState.lastFloor ?? 0;
      const targetFloor = oppFloor + 1 + Math.floor(Math.random() * MINE_REACH);
      await pusher.trigger(channel, 'mine_placed', { targetUserId: opp.userId, floor: targetFloor });
    } else if (itemId === 'bomb') {
      await pusher.trigger(channel, 'bomb_triggered', {
        targetUserId: opp.userId,
        atMs: nowMs + BOMB_FUSE_MS,
        durationMs: BOMB_DURATION_MS,
      });
    } else if (itemId === 'lightning') {
      await pusher.trigger(channel, 'lightning_triggered', {
        targetUserId: opp.userId,
        atMs: nowMs,
        durationMs: LIGHTNING_DURATION_MS,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
