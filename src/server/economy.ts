import { db, schema } from './db';
import { eq, sql } from 'drizzle-orm';
import { computeCoinReward, computeFinalScore } from '@/shared/scoring';
import type { Mode } from '@/shared/constants';
import type { FinalResult } from '@/shared/types';

export function computeRankedPayout(mode: number, reason: 'normal' | 'opponent_disconnect' = 'normal'): { winner: number; loser: number } {
  const table: Record<number, { winner: number; loser: number }> = {
    100: { winner: 30, loser: 5 },
  };
  const base = table[mode] ?? { winner: 0, loser: 0 };
  return reason === 'opponent_disconnect' ? { winner: base.winner, loser: 0 } : base;
}

export async function finalizeBotMatch(args: {
  matchId: string;
  userId: string;
  mode: Mode;
  result: FinalResult;
  maxCombo: number;
  totalCoins: number;
  failCount: number;
}) {
  const won = args.result.endReason === 'reached_goal';
  const score = computeFinalScore({
    finalFloor: args.result.finalFloor,
    maxCombo: args.maxCombo,
    totalCoins: args.totalCoins,
    failCount: args.failCount,
  });
  const reward = computeCoinReward({ mode: args.mode, won, isBot: true });
  const pickupCoins = args.totalCoins;

  await db.update(schema.matches)
    .set({ status: 'ended', endedAt: new Date(), winnerUserId: won ? args.userId : null })
    .where(eq(schema.matches.id, args.matchId));

  await db.update(schema.matchParticipants)
    .set({ finalFloor: args.result.finalFloor, finalScore: score, maxCombo: args.maxCombo, coinsEarned: reward + pickupCoins })
    .where(sql`${schema.matchParticipants.matchId} = ${args.matchId} AND ${schema.matchParticipants.userId} = ${args.userId}`);

  await db.update(schema.users)
    .set({ coins: sql`${schema.users.coins} + ${reward + pickupCoins}`, lastPlayedAt: new Date() })
    .where(eq(schema.users.id, args.userId));

  await db.insert(schema.transactions).values({
    userId: args.userId,
    type: 'match_reward',
    deltaCoins: reward + pickupCoins,
    metadata: { matchId: args.matchId, score, won, pickupCoins },
  });

  return { score, won, rewardCoins: reward, pickupCoins, totalDelta: reward + pickupCoins };
}
