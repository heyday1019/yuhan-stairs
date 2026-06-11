import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { buyBoost } from '@/server/boosts';
import { buyCosmetic } from '@/server/shop';
import type { BoostId } from '@/shared/shop-catalog';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const body = await req.json().catch(() => ({}));
    const { type, id } = body as { type?: string; id?: string };

    if (!type || !id) {
      return NextResponse.json({ error: 'type and id required' }, { status: 400 });
    }

    if (type === 'boost') {
      const result = await buyBoost(db as any, user.id, id as BoostId);
      return NextResponse.json({ ok: true, coinsAfter: result.coinsAfter });
    }

    if (type === 'cosmetic') {
      const result = await buyCosmetic(db as any, user.id, id);
      return NextResponse.json({ ok: true, coinsAfter: result.coinsAfter });
    }

    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = (e as Error).message;
    if (msg === 'insufficient coins' || msg === 'already owned' || msg === 'unknown characterId' || msg.startsWith('unknown boostId')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    throw e;
  }
}
