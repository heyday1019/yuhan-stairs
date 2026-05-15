import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { getRedis } from '@/server/redis';
import { tryCancel } from '@/server/matchmaking';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const removed = await tryCancel(getRedis(), user.id, 100);
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
