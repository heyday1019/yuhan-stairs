import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { getActiveBoosts } from '@/server/boosts';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const activeBoosts = await getActiveBoosts(db as any, user.id);
    return NextResponse.json({
      id: user.id,
      nickname: user.nickname,
      coins: user.coins,
      level: user.level,
      characterId: user.characterId,
      activeBoosts,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
