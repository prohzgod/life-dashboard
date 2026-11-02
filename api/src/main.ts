import 'reflect-metadata';
import { createApp } from './app';
import { createPgliteDb, createPostgresDb } from './db/db';
import type { FileStore } from './files/file-store';
import { MemoryFileStore } from './files/memory-file-store';

async function main() {
  const { db } = process.env.DB_DRIVER === 'pglite' ? await createPgliteDb() : createPostgresDb(process.env.DATABASE_URL!);
  const files: FileStore = new MemoryFileStore();
  const app = await createApp({ db, files, quotaBytes: Number(process.env.USER_FILE_QUOTA_BYTES ?? 1_000_000_000) });
  await app.listen(Number(process.env.PORT ?? 3000));
}

void main();
