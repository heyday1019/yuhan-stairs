import { NextRequest, NextResponse } from 'next/server';

export interface ParticipantLookup {
  isParticipant(matchId: string, userId: string): Promise<boolean>;
}

export async function canAuthorize(channel: string, userId: string, lookup: ParticipantLookup) {
  const userMatch = channel.match(/^private-user-(.+)$/);
  if (userMatch) {
    if (userMatch[1] !== userId) return { ok: false as const };
    return { ok: true as const, kind: 'private' as const };
  }
  const matchMatch = channel.match(/^presence-match-(.+)$/);
  if (matchMatch) {
    const ok = await lookup.isParticipant(matchMatch[1], userId);
    return ok ? { ok: true as const, kind: 'presence' as const, matchId: matchMatch[1] } : { ok: false as const };
  }
  return { ok: false as const };
}

export async function POST(req: NextRequest) {
  const [{ getCurrentUserFromHeaders, AuthError }, { getPusher }, { db, schema }, { and, eq }] = await Promise.all([
    import('@/server/auth'),
    import('@/server/pusher'),
    import('@/server/db'),
    import('drizzle-orm'),
  ]);

  const dbLookup: ParticipantLookup = {
    async isParticipant(matchId, userId) {
      const rows = await db.select().from(schema.matchParticipants)
        .where(and(eq(schema.matchParticipants.matchId, matchId), eq(schema.matchParticipants.userId, userId))).limit(1);
      return rows.length > 0;
    },
  };

  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const form = await req.formData();
    const socketId = String(form.get('socket_id'));
    const channel = String(form.get('channel_name'));
    const auth = await canAuthorize(channel, user.id, dbLookup);
    if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const pusher = getPusher();
    if (auth.kind === 'presence') {
      return NextResponse.json(pusher.authorizeChannel(socketId, channel, { user_id: user.id, user_info: { nickname: user.nickname } }));
    }
    return NextResponse.json(pusher.authorizeChannel(socketId, channel));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
