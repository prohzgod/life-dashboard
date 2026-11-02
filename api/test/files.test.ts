import request from 'supertest';
import { MAX_FILE_BYTES, type PresignRequest, type PresignResponse } from '@life-dashboard/shared';
import { MemoryFileStore } from '../src/files/memory-file-store';
import { createTestApp, signedIn, type TestApp } from './harness';

let t: TestApp;
let files: MemoryFileStore;
let agent: Awaited<ReturnType<typeof signedIn>>;

beforeEach(async () => {
  files = new MemoryFileStore();
  t = await createTestApp({ files, quotaBytes: 1000 });
  agent = await signedIn(t.app);
});
afterEach(() => t.close());

const item = (over: Partial<PresignRequest['items'][number]> = {}): PresignRequest['items'][number] => ({ attachmentId: '01ABC', kind: 'original', mime: 'image/jpeg', size: 100, mode: 'put', ...over });
const account = async (a: typeof agent) => (await a.get('/api/auth/me')).body.id as string;

it('requires a session', async () => {
  expect((await request(t.app.getHttpServer()).post('/api/files/presign').send({ items: [item()] })).status).toBe(401);
});

it('builds keys only under the signed-in account', async () => {
  const res = await agent.post('/api/files/presign').send({ items: [item({ kind: 'thumb' })] });
  expect(res.status).toBe(201);
  const body = res.body as PresignResponse;
  expect(body.items[0]).toMatchObject({ attachmentId: '01ABC', kind: 'thumb' });
  expect(body.items[0]!.url).toEqual(expect.any(String));
  expect(files.calls).toEqual([{ mode: 'put', key: `users/${await account(agent)}/attachments/01ABC/thumb` }]);
});

it('refuses an attachment id that could leave its folder', async () => {
  for (const attachmentId of ['../other', 'a/b', '']) {
    expect((await agent.post('/api/files/presign').send({ items: [item({ attachmentId })] })).status).toBe(400);
  }
  expect(files.calls).toEqual([]);
});

it('refuses a file over MAX_FILE_BYTES', async () => {
  const big = await createTestApp({ files, quotaBytes: MAX_FILE_BYTES * 10 });
  const a = await signedIn(big.app);
  expect((await a.post('/api/files/presign').send({ items: [item({ size: MAX_FILE_BYTES + 1 })] })).status).toBe(413);
  await big.close();
});

it("refuses an upload past the account's quota, and another account is unaffected", async () => {
  const stored = { id: 'att1', updatedAt: new Date().toISOString(), deletedAt: null, size: 950 };
  await agent.post('/api/sync/push').send({ rows: [{ table: 'attachments', id: 'att1', updatedAt: stored.updatedAt, deletedAt: null, payload: stored }] }).expect(201);
  expect((await agent.post('/api/files/presign').send({ items: [item({ size: 100 })] })).status).toBe(413);
  expect((await agent.post('/api/files/presign').send({ items: [item({ size: 40 })] })).status).toBe(201);
  const other = await signedIn(t.app, 'b@example.com');
  expect((await other.post('/api/files/presign').send({ items: [item({ size: 100 })] })).status).toBe(201);
});

it('a deleted attachment stops counting against the quota', async () => {
  const when = new Date().toISOString();
  const payload = { id: 'att1', updatedAt: when, deletedAt: when, size: 950 };
  await agent.post('/api/sync/push').send({ rows: [{ table: 'attachments', id: 'att1', updatedAt: when, deletedAt: when, payload }] }).expect(201);
  expect((await agent.post('/api/files/presign').send({ items: [item({ size: 100 })] })).status).toBe(201);
});

it("a get link can't reach another account's file", async () => {
  const other = await signedIn(t.app, 'b@example.com');
  await other.post('/api/files/presign').send({ items: [item({ mode: 'get', size: 0 })] }).expect(201);
  expect(files.calls.at(-1)).toEqual({ mode: 'get', key: `users/${await account(other)}/attachments/01ABC/original` });
});
