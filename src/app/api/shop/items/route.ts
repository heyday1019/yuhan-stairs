import { NextResponse } from 'next/server';

// Deprecated: replaced by /api/shop/catalog (M5)
export async function GET() {
  return NextResponse.json({ error: 'use /api/shop/catalog' }, { status: 410 });
}
