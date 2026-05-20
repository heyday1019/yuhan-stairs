#!/usr/bin/env node
// Dev-only: top every user's coin balance up to at least MIN_COINS.
// Usage: pnpm exec node scripts/grant-coins.mjs
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const MIN_COINS = Number(process.env.GRANT_MIN_COINS ?? '500');

const sql = neon(url);

const before = await sql`SELECT id, nickname, coins FROM users ORDER BY created_at DESC LIMIT 20`;
console.log(`Found ${before.length} users (showing up to 20):`);
for (const u of before) console.log(`  ${u.id}  ${u.nickname.padEnd(20)} coins=${u.coins}`);

const updated = await sql`
  UPDATE users
  SET coins = ${MIN_COINS}
  WHERE coins < ${MIN_COINS}
  RETURNING id, nickname, coins
`;

console.log(`\nTopped up ${updated.length} users to ${MIN_COINS} coins:`);
for (const u of updated) console.log(`  ${u.nickname.padEnd(20)} -> ${u.coins}`);

// Also drop a transaction row for auditability.
for (const u of updated) {
  await sql`
    INSERT INTO transactions (user_id, type, delta_coins, metadata)
    VALUES (${u.id}, 'grant', ${MIN_COINS}, ${JSON.stringify({ reason: 'dev_grant', script: 'grant-coins.mjs' })}::jsonb)
  `;
}
console.log('\nAudit transactions recorded.');
