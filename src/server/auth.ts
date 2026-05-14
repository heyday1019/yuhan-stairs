import { db, schema } from './db';
import { eq } from 'drizzle-orm';
import { getStubTossUser } from '@/lib/toss-sdk-stub';

export async function getOrCreateCurrentUser() {
  const stub = getStubTossUser();
  const existing = await db.select().from(schema.users).where(eq(schema.users.tossUserId, stub.id)).limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db.insert(schema.users).values({ tossUserId: stub.id, nickname: stub.nickname }).returning();
  return inserted[0];
}
