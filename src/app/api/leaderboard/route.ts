import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { getLeaderboard } from '@/server/leaderboard';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const url = new URL(req.url);

    // Issue 1: Validate tab param at runtime
    const tabParam = url.searchParams.get('tab');
    const tab: 'all' | 'weekly' = tabParam === 'weekly' ? 'weekly' : 'all';

    // Issue 2: Validate limit param and handle NaN
    const limitParam = Number(url.searchParams.get('limit') ?? '10');
    const limit = Math.min(isNaN(limitParam) ? 10 : Math.max(1, limitParam), 20);

    // Issue 3: Cast db with proper type safety
    const result = await getLeaderboard(db as unknown as typeof db, tab, limit, user.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
