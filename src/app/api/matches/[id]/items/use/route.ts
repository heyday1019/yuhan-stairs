import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db, schema } from '@/server/db';
import { getRedis } from '@/server/redis';
import { getPusher } from '@/server/pusher';
import { useItem } from '@/server/items';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await ctx.params;
    const user = await getCurrentUserFromHeaders(req.headers);

    const body = await req.json().catch(() => ({}));
    const itemId: unknown = body?.itemId;
    if (typeof itemId !== 'string' || !itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }

    const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
    if (!match) return NextResponse.json({ error: 'match not found' }, { status: 404 });
    if (match.status !== 'active') return NextResponse.json({ error: 'match not active' }, { status: 400 });

    const parts = await db.select().from(schema.matchParticipants).where(eq(schema.matchParticipants.matchId, matchId));
    const me = parts.find((p) => p.userId === user.id);
    if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const opp = parts.find((p) => p.userId && p.userId !== user.id);
    if (!opp?.userId) return NextResponse.json({ error: 'no opponent' }, { status: 400 });

    const nowMs = Date.now();
    let result;
    try {
      result = await useItem({ redis: getRedis(), db }, matchId, user.id, opp.userId, itemId, nowMs);
    } catch (e) {
      const msg = (e as Error).message;
      if (/equipped/.test(msg)) {
        await db.update(schema.matches)
          .set({ flaggedCount: sql`${schema.matches.flaggedCount} + 1` })
          .where(eq(schema.matches.id, matchId));
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const auditEntry = { userId: user.id, itemId, atMs: nowMs, metadata: result };
    await db.update(schema.matches)
      .set({ itemsUsed: sql`${schema.matches.itemsUsed} || ${JSON.stringify([auditEntry])}::jsonb` })
      .where(eq(schema.matches.id, matchId));

    const pusher = getPusher();
    const channel = `presence-match-${matchId}`;
    await pusher.trigger(channel, 'item_used', { userId: user.id, itemId, atMs: nowMs });
    if (result.kind === 'beanstalk') {
      await pusher.trigger(channel, 'beanstalk_used', result);
    } else if (result.kind === 'mine') {
      await pusher.trigger(channel, 'mine_placed', { targetUserId: result.targetUserId, floor: result.targetFloor });
    } else if (result.kind === 'bomb') {
      await pusher.trigger(channel, 'bomb_triggered', {
        targetUserId: result.targetUserId,
        atMs: result.triggerAtMs,
        durationMs: result.durationMs,
      });
    }

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
