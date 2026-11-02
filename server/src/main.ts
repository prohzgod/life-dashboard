import 'reflect-metadata';
import { raw, type Request, type Response } from 'express';
import { createApp } from './app';
import { createPgliteDb, createPostgresDb } from './db/db';
import type { FileStore } from './files/file-store';
import { MemoryFileStore } from './files/memory-file-store';
import { R2FileStore } from './files/r2-file-store';

async function main() {
  const { db } = process.env.DB_DRIVER === 'pglite' ? await createPgliteDb() : createPostgresDb(process.env.DATABASE_URL!);
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  const files: FileStore | MemoryFileStore = process.env.FILES_DRIVER === 'memory' ? new MemoryFileStore() : new R2FileStore(R2_ACCOUNT_ID!, R2_ACCESS_KEY_ID!, R2_SECRET_ACCESS_KEY!, R2_BUCKET!);
  const app = await createApp({ db, files, quotaBytes: Number(process.env.USER_FILE_QUOTA_BYTES ?? 1_000_000_000), dataQuotaBytes: Number(process.env.USER_DATA_QUOTA_BYTES ?? 500_000_000) });
  if (files instanceof MemoryFileStore) {
    // Stands in for R2 when testing locally: what the links from MemoryFileStore point at.
    app.use('/api/test-files', raw({ type: () => true, limit: '60mb' }), (req: Request, res: Response) => {
      const key = String(req.query.key);
      if (req.method === 'PUT') {
        files.bytes.set(key, { body: req.body as Buffer, mime: String(req.headers['content-type']) });
        res.status(200).end();
        return;
      }
      const file = files.bytes.get(key);
      if (!file) res.status(404).end();
      else res.type(file.mime).send(file.body);
    });
  }
  await app.listen(Number(process.env.PORT ?? 3000));
}

void main();
