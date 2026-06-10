import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { getLeaderboard, type DbWithExecute } from '@/server/leaderboard';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const url = new URL(req.url);

    const tabParam = url.searchParams.get('tab');
    const tab: 'all' | 'weekly' = tabParam === 'weekly' ? 'weekly' : 'all';

    const limitParam = Number(url.searchParams.get('limit') ?? '10');
    const limit = Math.min(isNaN(limitParam) ? 10 : Math.max(1, limitParam), 20);

    const result = await getLeaderboard(db as unknown as DbWithExecute, tab, limit, user.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
