import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders, AuthError } from '@/server/auth';
import { db } from '@/server/db';
import { getCatalog, getInventoryFor } from '@/server/shop';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    const inventory = await getInventoryFor(db, user.id);
    return NextResponse.json({
      catalog: getCatalog(),
      inventory,
      coins: user.coins,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
