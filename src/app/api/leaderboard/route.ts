import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { getLeaderboard } from '@/server/leaderboard';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const url = new URL(req.url);
    const tab = (url.searchParams.get('tab') ?? 'all') as 'all' | 'weekly';
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '10'), 20);

    const result = await getLeaderboard(db as any, tab, limit, user.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
