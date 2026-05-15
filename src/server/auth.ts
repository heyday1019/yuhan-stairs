import { db, schema } from './db';
import { eq } from 'drizzle-orm';

export class AuthError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

export async function getCurrentUserFromHeaders(headers: Headers) {
  const deviceId = headers.get('x-device-id');
  if (!deviceId || !/^[0-9a-f-]{36}$/i.test(deviceId)) {
    throw new AuthError(401, 'missing or invalid x-device-id');
  }
  const tossUserId = `device:${deviceId}`;
  const existing = await db.select().from(schema.users).where(eq(schema.users.tossUserId, tossUserId)).limit(1);
  if (!existing[0]) throw new AuthError(404, 'user not registered');
  return existing[0];
}

export async function registerUser(deviceId: string, nickname: string) {
  if (!/^[0-9a-f-]{36}$/i.test(deviceId)) throw new AuthError(400, 'invalid deviceId');
  const trimmed = nickname.trim();
  if (trimmed.length < 1 || trimmed.length > 16) throw new AuthError(400, 'nickname must be 1-16 chars');
  const tossUserId = `device:${deviceId}`;
  const existing = await db.select().from(schema.users).where(eq(schema.users.tossUserId, tossUserId)).limit(1);
  if (existing[0]) {
    return existing[0];
  }
  const inserted = await db.insert(schema.users).values({ tossUserId, nickname: trimmed }).returning();
  return inserted[0];
}
