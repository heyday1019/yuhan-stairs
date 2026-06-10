import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { getRedis } from '@/server/redis';
import { getPusher } from '@/server/pusher';
import { sendEmoji } from '@/server/emoji';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await ctx.params;
    const user = await getCurrentUserFromHeaders(req.headers);
    const body = await req.json().catch(() => ({}));
    const emoji = typeof body?.emoji === 'string' ? body.emoji : '';
    if (!emoji || emoji.length > 8) {
      return NextResponse.json({ error: 'invalid emoji' }, { status: 400 });
    }

    const result = await sendEmoji(
      { db: db as any, redis: getRedis(), pusher: getPusher() },
      matchId,
      user.id,
      emoji,
    );

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
