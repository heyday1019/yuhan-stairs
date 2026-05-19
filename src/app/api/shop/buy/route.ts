import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { buyItem, getInventoryFor } from '@/server/shop';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);

    let body: { itemId?: string; qty?: number };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad body' }, { status: 400 }); }
    if (typeof body.itemId !== 'string' || typeof body.qty !== 'number') {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    try {
      const { coinsAfter } = await buyItem(db, user.id, body.itemId, body.qty);
      const inventory = await getInventoryFor(db, user.id);
      return NextResponse.json({ ok: true, coins: coinsAfter, inventory });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
