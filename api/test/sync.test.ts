import request from 'supertest';
import { sql } from 'drizzle-orm';
import { MAX_ROW_BYTES, type PullResponse, type PushResponse, type SyncRow } from '@life-dashboard/shared';
import { createTestApp, signedIn, type TestApp } from './harness';

let t: TestApp;
let agent: Awaited<ReturnType<typeof signedIn>>;

beforeEach(async () => {
  t = await createTestApp();
  agent = await signedIn(t.app);
});
afterEach(() => t.close());

const at = (offsetMs = 0) => new Date(Date.now() - 3_600_000 + offsetMs).toISOString();
function row(id: string, updatedAt: string, title = 'x', deletedAt: string | null = null): SyncRow {
  return { table: 'tasks', id, updatedAt, deletedAt, payload: { id, title, updatedAt, deletedAt, createdAt: updatedAt } };
}
const push = async (a: typeof agent, ...rows: SyncRow[]) => (await a.post('/api/sync/push').send({ rows }).expect(201)).body as PushResponse;
const pull = async (a: typeof agent, cursor = 0) => (await a.get(`/api/sync/pull?cursor=${cursor}`).expect(200)).body as PullResponse;

it('requires a session', async () => {
  const http = request(t.app.getHttpServer());
  expect((await http.post('/api/sync/push').send({ rows: [] })).status).toBe(401);
  expect((await http.get('/api/sync/pull')).status).toBe(401);
});

it('a newer row replaces an older one and gets a new seq', async () => {
  await push(agent, row('1', at(0), 'old'));
  const first = await pull(agent);
  const res = await push(agent, row('1', at(1000), 'new'));
  expect(res.accepted).toEqual(['1']);
  const second = await pull(agent, first.cursor);
  expect(second.rows).toHaveLength(1);
  expect(second.rows[0]!.payload.title).toBe('new');
  expect(second.cursor).toBeGreaterThan(first.cursor);
});

it('an older row loses and comes back in winners', async () => {
  await push(agent, row('1', at(1000), 'newer'));
  const res = await push(agent, row('1', at(0), 'older'));
  expect(res.accepted).toEqual([]);
  expect(res.winners).toHaveLength(1);
  expect(res.winners[0]!.payload.title).toBe('newer');
});

it('pushing the same row twice changes nothing', async () => {
  const same = row('1', at());
  await push(agent, same);
  const { cursor } = await pull(agent);
  await push(agent, same);
  expect((await pull(agent, cursor)).rows).toEqual([]);
});

it('a soft delete travels like any other change', async () => {
  await push(agent, row('1', at(0)));
  const del = at(1000);
  await push(agent, row('1', del, 'x', del));
  const { rows } = await pull(agent);
  expect(rows[0]!.deletedAt).toBe(del);
});

it('clamps a clock that runs ahead', async () => {
  const ahead = new Date(Date.now() + 86_400_000).toISOString();
  const res = await push(agent, row('1', ahead));
  expect(res.winners).toHaveLength(1);
  const stored = new Date(res.winners[0]!.updatedAt).getTime();
  expect(Math.abs(stored - Date.now())).toBeLessThan(10_000);
  expect(res.winners[0]!.payload.updatedAt).toBe(res.winners[0]!.updatedAt);
});

it('keeps a row dated within 5 minutes ahead as sent', async () => {
  const ahead = new Date(Date.now() + 240_000).toISOString();
  const res = await push(agent, row('1', ahead));
  expect(res.accepted).toEqual(['1']);
  expect((await pull(agent)).rows[0]!.updatedAt).toBe(ahead);
});

it('pull pages in seq order', async () => {
  const rows = Array.from({ length: 501 }, (_, i) => row(`r${i}`, at()));
  await push(agent, ...rows);
  const first = await pull(agent);
  expect(first.rows).toHaveLength(500);
  expect(first.hasMore).toBe(true);
  const second = await pull(agent, first.cursor);
  expect(second.rows).toHaveLength(1);
  expect(second.hasMore).toBe(false);
  const ids = [...first.rows, ...second.rows].map((r) => r.id);
  expect(new Set(ids).size).toBe(501);
});

it("one account cannot read or overwrite another's rows", async () => {
  await push(agent, row('1', at(0), 'mine'));
  const other = await signedIn(t.app, 'b@example.com');
  expect((await pull(other)).rows).toEqual([]);
  expect((await push(other, row('1', at(1000), 'theirs'))).accepted).toEqual(['1']);
  expect((await pull(agent)).rows[0]!.payload.title).toBe('mine');
  expect((await pull(other)).rows[0]!.payload.title).toBe('theirs');
});

it('rejects an unknown table and a row over MAX_ROW_BYTES', async () => {
  const bad = { ...row('1', at()), table: 'users' };
  expect((await agent.post('/api/sync/push').send({ rows: [bad] })).status).toBe(400);
  const huge = row('2', at(), 'x'.repeat(MAX_ROW_BYTES + 1));
  expect((await agent.post('/api/sync/push').send({ rows: [huge] })).status).toBe(413);
});

it('stores the same row in two tables separately', async () => {
  await push(agent, row('1', at()), { ...row('1', at()), table: 'goals' });
  const res = await t.db.execute(sql`select count(*)::int as n from records`);
  expect(res.rows[0]!.n).toBe(2);
});
