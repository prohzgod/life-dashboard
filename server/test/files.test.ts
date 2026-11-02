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

const presign = (a: typeof agent, ...items: PresignRequest['items']) => a.post('/api/files/presign').send({ items });

it('counts what it has signed uploads for, whatever rows are pushed', async () => {
  expect((await presign(agent, item({ attachmentId: 'a', size: 900 }))).status).toBe(201);
  expect((await presign(agent, item({ attachmentId: 'b', size: 900 }))).status).toBe(413);
  expect((await presign(agent, item({ attachmentId: 'c', size: 100 }))).status).toBe(201);
});

it('counts thumbnails too', async () => {
  expect((await presign(agent, item({ size: 600 }), item({ kind: 'thumb', size: 600 }))).status).toBe(413);
});

it('signing the same file again counts it once', async () => {
  expect((await presign(agent, item({ size: 600 }))).status).toBe(201);
  expect((await presign(agent, item({ size: 700 }))).status).toBe(201);
  expect((await presign(agent, item({ attachmentId: 'other', size: 400 }))).status).toBe(413);
});

it('a row claiming a negative size frees nothing', async () => {
  const when = new Date().toISOString();
  await agent.post('/api/sync/push').send({ rows: [{ table: 'attachments', id: 'x', updatedAt: when, deletedAt: null, payload: { size: -999999 } }] }).expect(201);
  expect((await presign(agent, item({ size: 1001 }))).status).toBe(413);
});

it('another account has its own quota', async () => {
  expect((await presign(agent, item({ size: 900 }))).status).toBe(201);
  const other = await signedIn(t.app, 'b@example.com');
  expect((await presign(other, item({ size: 900 }))).status).toBe(201);
});

it('refuses a device that means a different account from the session', async () => {
  expect((await agent.post('/api/files/presign').set('x-sync-account', 'someone else').send({ items: [item()] })).status).toBe(409);
  expect(files.calls).toEqual([]);
});

it("a get link can't reach another account's file", async () => {
  const other = await signedIn(t.app, 'b@example.com');
  await other.post('/api/files/presign').send({ items: [item({ mode: 'get', size: 0 })] }).expect(201);
  expect(files.calls.at(-1)).toEqual({ mode: 'get', key: `users/${await account(other)}/attachments/01ABC/original` });
});
