import { pgTable, uuid, text, integer, timestamp, boolean, jsonb, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tossUserId: text('toss_user_id').notNull().unique(),
  nickname: text('nickname').notNull(),
  avatarId: text('avatar_id'),
  coins: integer('coins').notNull().default(0),
  level: integer('level').notNull().default(1),
  totalXp: integer('total_xp').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
  characterId: text('character_id').notNull().default('pink-beanie'),
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  mode: integer('mode').notNull(),
  stairSeed: text('stair_seed').notNull(),
  matchType: text('match_type').notNull(),       // 'ranked' | 'friend' | 'bot'
  status: text('status').notNull(),              // 'pending' | 'active' | 'ended' | 'abandoned'
  startedAt: timestamp('started_at', { withTimezone: true }),
  matchStartedAt: timestamp('match_started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  winnerUserId: uuid('winner_user_id'),
  flagged: boolean('flagged').notNull().default(false),
  flaggedCount: integer('flagged_count').notNull().default(0),
  itemsUsed: jsonb('items_used').notNull().default(sql`'[]'::jsonb`),
}, (t) => ({ modeEndedAt: index('matches_mode_ended_idx').on(t.mode, t.endedAt) }));

export const matchParticipants = pgTable('match_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  userId: uuid('user_id').references(() => users.id),         // null for bots
  botDifficulty: text('bot_difficulty'),                       // null = real user
  finalFloor: integer('final_floor'),
  finalScore: integer('final_score'),
  maxCombo: integer('max_combo'),
  coinsEarned: integer('coins_earned'),
}, (t) => ({
  matchUserUq: uniqueIndex('match_participants_match_user_uq').on(t.matchId, t.userId),
  userIdx: index('match_participants_user_idx').on(t.userId, t.matchId),
}));

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  deltaCoins: integer('delta_coins').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ userTimeIdx: index('transactions_user_time_idx').on(t.userId, t.createdAt) }));

export const inventoryItems = pgTable('inventory_items', {
  userId: uuid('user_id').notNull().references(() => users.id),
  itemId: text('item_id').notNull(),                    // 'bomb' | 'mine' | 'beanstalk'
  quantity: integer('quantity').notNull().default(0),
}, (t) => ({
  pk: uniqueIndex('inventory_items_pk').on(t.userId, t.itemId),
}));

export const userBoosts = pgTable('user_boosts', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  boostType:      text('boost_type').notNull(),
  gamesRemaining: integer('games_remaining').notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('user_boosts_user_id_idx').on(t.userId),
}));
