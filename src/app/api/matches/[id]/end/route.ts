import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/server/db';
import { eq } from 'drizzle-orm';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { finalizeBotMatch } from '@/server/economy';
import { generateStairs } from '@/shared/stair-generator';
import { FAIL_PENALTY_FLOORS, type Mode } from '@/shared/constants';

const Body = z.object({
  finalFloor: z.number().int().min(0),
  maxFloorReached: z.number().int().min(0).optional(),
  maxCombo: z.number().int().min(0),
  totalCoins: z.number().int().min(0),
  failCount: z.number().int().min(0),
  endReason: z.enum(['reached_goal', 'opponent_reached_goal', 'timeout', 'abandoned']),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = Body.parse(await req.json());
    const user = await getCurrentUserFromHeaders(req.headers);

    const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, id)).limit(1);
    if (!match || match.status !== 'active') return NextResponse.json({ error: 'invalid match' }, { status: 400 });

    // Server-side check: regenerate stairs from seed and verify coin pickup count is plausible.
    // store.ts grants coins from hasCoin (+1), isBooster (+3), and every 5th combo (+1). A
    // player who fails retreats FAIL_PENALTY_FLOORS but keeps coins already picked up, so the
    // ceiling has to be based on the highest floor ever reached, not finalFloor. failCount also
    // extends the combo-bonus ceiling because each retreated step costs one extra successful tap.
    const stairs = generateStairs(match.stairSeed, match.mode);
    const peakFloor = Math.max(body.maxFloorReached ?? 0, body.finalFloor);
    const traversed = stairs.slice(0, peakFloor);
    const coinStairs = traversed.filter((s) => s.hasCoin).length;
    const boosterStairs = traversed.filter((s) => s.isBooster).length;
    const maxSuccessfulTaps = peakFloor + body.failCount * FAIL_PENALTY_FLOORS;
    const maxComboBonus = Math.floor(maxSuccessfulTaps / 5);
    const maxCoinsAvailable = coinStairs + boosterStairs * 3 + maxComboBonus;
    if (body.totalCoins > maxCoinsAvailable) {
      await db.update(schema.matches).set({ flagged: true }).where(eq(schema.matches.id, id));
      return NextResponse.json({ error: 'coins exceed available' }, { status: 400 });
    }

    const result = await finalizeBotMatch({
      matchId: id,
      userId: user.id,
      mode: match.mode as Mode,
      result: {
        finalFloor: body.finalFloor,
        finalScore: 0,             // computed inside
        maxCombo: body.maxCombo,
        totalCoins: body.totalCoins,
        failCount: body.failCount,
        endReason: body.endReason,
      },
      maxCombo: body.maxCombo,
      totalCoins: body.totalCoins,
      failCount: body.failCount,
    });

    return NextResponse.json({ ...result, itemsUsed: match.itemsUsed ?? [] });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
