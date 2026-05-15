import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { getRedis } from '@/server/redis';
import { getPusher } from '@/server/pusher';
import { db, schema } from '@/server/db';
import { and, eq, sql } from 'drizzle-orm';
import { clearMatchLookup } from '@/server/matchmaking';
import { computeRankedPayout } from '@/server/economy';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await ctx.params;
    const user = await getCurrentUserFromHeaders(req.headers);
    const body = await req.json() as { finalFloor: number; finalScore: number; maxCombo: number; coins: number };

    const updated = await db.update(schema.matches)
      .set({ status: 'ended', winnerUserId: user.id, endedAt: new Date() })
      .where(and(eq(schema.matches.id, matchId), eq(schema.matches.status, 'active')))
      .returning();

    if (updated.length === 0) {
      const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
      return NextResponse.json({ ok: true, alreadyEnded: true, winnerUserId: match?.winnerUserId ?? null });
    }

    const match = updated[0];
    const participants = await db.select().from(schema.matchParticipants).where(eq(schema.matchParticipants.matchId, matchId));
    const winner = participants.find((p) => p.userId === user.id);
    const loser = participants.find((p) => p.userId !== user.id);
    if (!winner || !loser?.userId) return NextResponse.json({ ok: true });

    const payout = computeRankedPayout(match.mode);

    await db.transaction(async (tx) => {
      await tx.update(schema.matchParticipants).set({
        finalFloor: body.finalFloor, finalScore: body.finalScore, maxCombo: body.maxCombo, coinsEarned: payout.winner,
      }).where(and(eq(schema.matchParticipants.matchId, matchId), eq(schema.matchParticipants.userId, user.id)));
      await tx.update(schema.matchParticipants).set({ coinsEarned: payout.loser })
        .where(and(eq(schema.matchParticipants.matchId, matchId), eq(schema.matchParticipants.userId, loser.userId!)));
      await tx.insert(schema.transactions).values([
        { userId: user.id, type: 'match_reward', deltaCoins: payout.winner, metadata: { matchId, role: 'winner' } },
        { userId: loser.userId!, type: 'match_reward', deltaCoins: payout.loser, metadata: { matchId, role: 'loser' } },
      ]);
      await tx.execute(sql`update users set coins = coins + ${payout.winner} where id = ${user.id}`);
      await tx.execute(sql`update users set coins = coins + ${payout.loser} where id = ${loser.userId!}`);
    });

    const r = getRedis();
    await Promise.all([clearMatchLookup(r, user.id), clearMatchLookup(r, loser.userId!)]);

    await getPusher().trigger(`presence-match-${matchId}`, 'match_ended', {
      reason: 'normal', winnerUserId: user.id,
      coins: { [user.id]: payout.winner, [loser.userId!]: payout.loser },
    });

    return NextResponse.json({ ok: true, winnerUserId: user.id });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
