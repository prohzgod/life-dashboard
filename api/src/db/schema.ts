import { bigint, index, jsonb, pgSequence, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Only a hash of the session token is kept, so a copy of this table can't sign anyone in. */
export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  deviceName: text('device_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Gives every write its place in line. Pulls follow it, because device clocks can't be trusted. */
export const recordsSeq = pgSequence('records_seq');

/** Every synced row of every account, whatever its table, as JSON. A new app field needs no migration. */
export const records = pgTable(
  'records',
  {
    userId: text('user_id').notNull().references(() => users.id),
    tableName: text('table_name').notNull(),
    id: text('id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
    seq: bigint('seq', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tableName, t.id] }), index('records_user_seq').on(t.userId, t.seq)],
);
