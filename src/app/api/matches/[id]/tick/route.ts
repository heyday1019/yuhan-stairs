import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { getRedis } from '@/server/redis';
import { getPusher } from '@/server/pusher';
import { db, schema } from '@/server/db';
import { and, eq, sql } from 'drizzle-orm';
import { generateStairs } from '@/shared/stair-generator';
import { validateTick, type ValidatorState } from '@/server/tick-validator';
import { clearMatchLookup } from '@/server/matchmaking';
import { computeRankedPayout } from '@/server/economy';
import type { Stair } from '@/shared/types';

const stairsCache = new Map<string, Stair[]>();
function getStairs(seed: string, mode: number): Stair[] {
  let s = stairsCache.get(seed);
  if (!s) { s = generateStairs(seed, mode); stairsCache.set(seed, s); }
  return s;
}

const DISCONNECT_GRACE_MS = 10_000;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await ctx.params;
    const user = await getCurrentUserFromHeaders(req.headers);
    const tick = await req.json() as { seq: number; floor: number; combo: number; coins: number; failCount: number; lastEvent?: 'fail'|'booster'|'item' };

    const r = getRedis();
    const pusher = getPusher();

    const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
    if (!match || match.status !== 'active' || !match.matchStartedAt) {
      return NextResponse.json({ error: 'match not active' }, { status: 409 });
    }

    const isParticipant = await db.select().from(schema.matchParticipants)
      .where(and(eq(schema.matchParticipants.matchId, matchId), eq(schema.matchParticipants.userId, user.id))).limit(1);
    if (isParticipant.length === 0) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const stairs = getStairs(match.stairSeed, match.mode);
    const stateKey = `match:state:${matchId}:${user.id}`;
    const stored = await r.get(stateKey);
    const prev: ValidatorState = stored
      ? JSON.parse(stored)
      : { matchStartedAtMs: match.matchStartedAt.getTime(), lastSeq: 0, lastFloor: 0, flaggedCount: match.flaggedCount };

    const elapsed = Date.now() - prev.matchStartedAtMs;
    const result = validateTick(tick, prev, stairs, elapsed);

    if (!result.ok) {
      if (result.invalidated) {
        await db.update(schema.matches).set({ flagged: true, flaggedCount: result.nextState.flaggedCount, status: 'ended', endedAt: new Date() }).where(eq(schema.matches.id, matchId));
        await pusher.trigger(`presence-match-${matchId}`, 'match_ended', { reason: 'invalidated' });
        return NextResponse.json({ ok: false, reason: result.reason, invalidated: true });
      }
      if (result.nextState.flaggedCount !== prev.flaggedCount) {
        await db.update(schema.matches).set({ flaggedCount: result.nextState.flaggedCount }).where(eq(schema.matches.id, matchId));
      }
      await r.set(stateKey, JSON.stringify(result.nextState), { ex: 90 });
      return NextResponse.json({ ok: false, reason: result.reason });
    }

    await r.set(stateKey, JSON.stringify(result.nextState), { ex: 90 });

    const participants = await db.select().from(schema.matchParticipants).where(eq(schema.matchParticipants.matchId, matchId));
    const opponent = participants.find((p) => p.userId !== user.id);
    if (opponent?.userId) {
      const dKey = `match:disconnect:${matchId}:${opponent.userId}`;
      const dVal = await r.get(dKey);
      if (dVal) {
        const elapsedDisc = Date.now() - Number(dVal);
        if (elapsedDisc >= DISCONNECT_GRACE_MS) {
          await db.update(schema.matches).set({ status: 'ended', winnerUserId: user.id, endedAt: new Date() }).where(eq(schema.matches.id, matchId));
          await Promise.all([
            clearMatchLookup(r, user.id),
            clearMatchLookup(r, opponent.userId),
            pusher.trigger(`presence-match-${matchId}`, 'match_ended', { reason: 'opponent_disconnect', winnerUserId: user.id }),
          ]);
          await payoutDisconnectWin(matchId, user.id, opponent.userId, match.mode);
          return NextResponse.json({ ok: true, ended: 'opponent_disconnect' });
        }
        await pusher.trigger(`presence-match-${matchId}`, 'opponent_disconnected_grace', { userId: opponent.userId, remainingMs: DISCONNECT_GRACE_MS - elapsedDisc });
      }
    }

    await pusher.trigger(`presence-match-${matchId}`, 'opponent_tick', {
      userId: user.id, floor: tick.floor, combo: tick.combo, lastEvent: tick.lastEvent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

async function payoutDisconnectWin(matchId: string, winnerId: string, loserId: string, mode: number) {
  const payout = computeRankedPayout(mode, 'opponent_disconnect');
  await db.transaction(async (tx) => {
    await tx.insert(schema.transactions).values([
      { userId: winnerId, type: 'match_reward', deltaCoins: payout.winner, metadata: { matchId, role: 'winner_disconnect' } },
      { userId: loserId, type: 'match_reward', deltaCoins: payout.loser, metadata: { matchId, role: 'loser_disconnect' } },
    ]);
    await tx.update(schema.matchParticipants).set({ coinsEarned: payout.winner }).where(and(eq(schema.matchParticipants.matchId, matchId), eq(schema.matchParticipants.userId, winnerId)));
    await tx.update(schema.matchParticipants).set({ coinsEarned: payout.loser }).where(and(eq(schema.matchParticipants.matchId, matchId), eq(schema.matchParticipants.userId, loserId)));
    await tx.execute(sql`update users set coins = coins + ${payout.winner} where id = ${winnerId}`);
  });
}
