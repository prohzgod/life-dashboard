import 'reflect-metadata';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createPgliteDb, type Db } from '../src/db/db';
import { createApp } from '../src/app';
import type { FileStore } from '../src/files/file-store';
import { MemoryFileStore } from '../src/files/memory-file-store';

export type TestApp = { app: INestApplication; db: Db; files: FileStore; close(): Promise<void> };

/** The real API on an in-memory Postgres. */
export async function createTestApp(options: { files?: FileStore; quotaBytes?: number } = {}): Promise<TestApp> {
  const { db, close } = await createPgliteDb();
  const files = options.files ?? new MemoryFileStore();
  const app = await createApp({ db, files, quotaBytes: options.quotaBytes ?? 1_000_000_000 });
  await app.init();
  return { app, db, files, close: async () => { await app.close(); await close(); } };
}

/** Registers an account and returns an agent that keeps its session cookie. */
export async function signedIn(app: INestApplication, email = 'a@example.com') {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/register').send({ email, password: 'correct horse battery', deviceName: 'test' });
  expect(res.status).toBe(201);
  return agent;
}
