import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    return NextResponse.json({ id: user.id, nickname: user.nickname, coins: user.coins, level: user.level });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
