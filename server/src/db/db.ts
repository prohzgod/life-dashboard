import { join } from 'node:path';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;
export const DB = Symbol('DB');

const MIGRATIONS = join(__dirname, '..', '..', 'drizzle');

export function createPostgresDb(url: string): { db: Db; close(): Promise<void> } {
  const pool = new Pool({ connectionString: url, max: 5 });
  return { db: drizzlePg(pool, { schema }), close: () => pool.end() };
}

export async function migratePostgres(db: Db) {
  await migratePg(db, { migrationsFolder: MIGRATIONS });
}

/** An in-memory Postgres for tests and e2e. Never used in production. */
export async function createPgliteDb(): Promise<{ db: Db; close(): Promise<void> }> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  // The two drivers share drizzle's query API; only the connection differs.
  return { db: db as unknown as Db, close: () => client.close() };
}
