import 'reflect-metadata';
import { createApp } from './app';
import { createPgliteDb, createPostgresDb } from './db/db';
import type { FileStore } from './files/file-store';
import { MemoryFileStore } from './files/memory-file-store';
import { R2FileStore } from './files/r2-file-store';

async function main() {
  const { db } = process.env.DB_DRIVER === 'pglite' ? await createPgliteDb() : createPostgresDb(process.env.DATABASE_URL!);
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  const files: FileStore = process.env.FILES_DRIVER === 'memory' ? new MemoryFileStore() : new R2FileStore(R2_ACCOUNT_ID!, R2_ACCESS_KEY_ID!, R2_SECRET_ACCESS_KEY!, R2_BUCKET!);
  const app = await createApp({ db, files, quotaBytes: Number(process.env.USER_FILE_QUOTA_BYTES ?? 1_000_000_000) });
  await app.listen(Number(process.env.PORT ?? 3000));
}

void main();
