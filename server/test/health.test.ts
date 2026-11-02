import { existsSync } from 'node:fs';
import request from 'supertest';
import { createTestApp, type TestApp } from './harness';

let t: TestApp;
beforeAll(async () => { t = await createTestApp(); });
afterAll(() => t.close());

it('GET /api/health returns ok without signing in', async () => {
  const res = await request(t.app.getHttpServer()).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

it('creates the tables', async () => {
  const res = await t.db.execute("select table_name from information_schema.tables where table_schema='public' order by 1");
  expect(res.rows.map((r) => r.table_name)).toEqual(expect.arrayContaining(['records', 'sessions', 'users']));
});

it('stays out of a root api/ folder, which Vercel would turn into functions', () => {
  expect(existsSync('../api')).toBe(false);
  expect(existsSync('../server/src/main.ts')).toBe(true);
});
