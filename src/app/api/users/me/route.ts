import { NextResponse } from 'next/server';
import { getOrCreateCurrentUser } from '@/server/auth';

export async function GET() {
  const user = await getOrCreateCurrentUser();
  return NextResponse.json({ id: user.id, nickname: user.nickname, coins: user.coins, level: user.level });
}
