import { NextRequest, NextResponse } from 'next/server';
import { registerUser, AuthError } from '@/server/auth';

export async function POST(req: NextRequest) {
  try {
    const { deviceId, nickname } = await req.json();
    const user = await registerUser(deviceId, nickname);
    return NextResponse.json({ id: user.id, nickname: user.nickname });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
