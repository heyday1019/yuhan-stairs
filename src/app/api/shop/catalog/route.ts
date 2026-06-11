import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { BOOSTS, COSMETICS } from '@/shared/shop-catalog';
import { getActiveBoosts } from '@/server/boosts';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const activeBoosts = await getActiveBoosts(db as any, user.id);
    return NextResponse.json({
      coins: user.coins,
      characterId: (user as any).characterId ?? 'pink-beanie',
      activeBoosts,
      boosts: BOOSTS,
      cosmetics: COSMETICS,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
