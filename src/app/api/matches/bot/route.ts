import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateCurrentUser } from '@/server/auth';
import { createBotMatch } from '@/server/matches';
import { MODES } from '@/shared/constants';

const Body = z.object({ mode: z.number() });

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  if (!MODES.includes(body.mode as any)) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }
  const user = await getOrCreateCurrentUser();
  const result = await createBotMatch({ userId: user.id, mode: body.mode as any });
  return NextResponse.json(result);
}
