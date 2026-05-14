import { db, schema } from './db';
import { eq } from 'drizzle-orm';
import type { BotDifficulty } from '@/shared/types';
import type { Mode } from '@/shared/constants';

export async function createBotMatch(args: { userId: string; mode: Mode }) {
  const seed = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Difficulty selection: pick based on user level (simple linear ramp).
  const user = (await db.select().from(schema.users).where(eq(schema.users.id, args.userId)).limit(1))[0];
  const difficulty: BotDifficulty = user.level < 3 ? 'easy' : user.level < 8 ? 'normal' : 'hard';
  const [match] = await db
    .insert(schema.matches)
    .values({ mode: args.mode, stairSeed: seed, matchType: 'bot', status: 'active', startedAt: new Date() })
    .returning();
  await db.insert(schema.matchParticipants).values([
    { matchId: match.id, userId: args.userId },
    { matchId: match.id, userId: null, botDifficulty: difficulty },
  ]);
  return { matchId: match.id, seed, mode: args.mode, botDifficulty: difficulty };
}
