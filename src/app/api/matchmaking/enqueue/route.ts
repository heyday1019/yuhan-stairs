import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { getRedis } from '@/server/redis';
import { getPusher } from '@/server/pusher';
import { db, schema } from '@/server/db';
import { eq } from 'drizzle-orm';
import { tryEnqueue, setMatchLookup } from '@/server/matchmaking';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const { mode } = await req.json();
    if (mode !== 100) return NextResponse.json({ error: 'only mode 100 supported in M2' }, { status: 400 });

    const r = getRedis();
    const result = await tryEnqueue(r, user.id, mode, Date.now());

    if (result.status !== 'paired') return NextResponse.json(result);

    const seed = crypto.randomUUID();
    const [match] = await db.insert(schema.matches).values({
      mode, stairSeed: seed, matchType: 'ranked', status: 'pending',
    }).returning();

    await db.insert(schema.matchParticipants).values([
      { matchId: match.id, userId: user.id },
      { matchId: match.id, userId: result.opponentUserId },
    ]);

    await setMatchLookup(r, user.id, match.id);
    await setMatchLookup(r, result.opponentUserId, match.id);

    const [opponent] = await db.select().from(schema.users).where(eq(schema.users.id, result.opponentUserId)).limit(1);

    const pusher = getPusher();
    await Promise.all([
      pusher.trigger(`private-user-${user.id}`, 'match_ready', { matchId: match.id, opponentNickname: opponent.nickname, role: 'B' }),
      pusher.trigger(`private-user-${result.opponentUserId}`, 'match_ready', { matchId: match.id, opponentNickname: user.nickname, role: 'A' }),
    ]);

    return NextResponse.json({ status: 'paired', matchId: match.id });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
