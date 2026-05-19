import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db, schema } from '@/server/db';
import { getRedis } from '@/server/redis';
import { equipItems } from '@/server/items';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await ctx.params;
    const user = await getCurrentUserFromHeaders(req.headers);

    const body = await req.json().catch(() => ({}));
    const slots: unknown = body?.itemIds;
    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'itemIds must be array' }, { status: 400 });
    }

    const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
    if (!match) return NextResponse.json({ error: 'match not found' }, { status: 404 });
    if (match.status !== 'pending') return NextResponse.json({ error: 'match already started' }, { status: 400 });

    const isParticipant = await db.select().from(schema.matchParticipants)
      .where(and(eq(schema.matchParticipants.matchId, matchId), eq(schema.matchParticipants.userId, user.id))).limit(1);
    if (isParticipant.length === 0) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    try {
      await equipItems({ redis: getRedis(), db }, matchId, user.id, slots as string[]);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
