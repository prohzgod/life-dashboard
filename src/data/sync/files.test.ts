// @vitest-environment node
import { MAX_FILE_BYTES, SYNC_TABLES, type PresignRequest, type SyncRow } from '@shared';
import { db } from '../db';
import { freshDatabase } from '../testing';
import type { SyncApi } from './api';
import { syncNow } from './engine';
import { META, setMeta } from './meta';

type Att = { id: string; blob: Blob; thumbBlob: Blob | null; size: number; dirty?: number };
const now = () => new Date().toISOString();

function attachment(id: string, over: Partial<Att> & { deletedAt?: string | null } = {}) {
  const t = now();
  return { id, nodeId: null, blob: new Blob(['original!'], { type: 'image/png' }), thumbBlob: new Blob(['th'], { type: 'image/jpeg' }), mime: 'image/png', size: 9, width: 1, height: 1, createdAt: t, updatedAt: t, deletedAt: null, ...over } as never;
}

const wire = (id: string, fields: object = {}): SyncRow => {
  const t = now();
  return { table: 'attachments', id, updatedAt: t, deletedAt: null, payload: { id, nodeId: null, mime: 'image/png', size: 9, width: 1, height: 1, createdAt: t, updatedAt: t, deletedAt: null, hasThumb: true, ...fields } };
};

/** A fake API and file store that record the order things happen in. */
function setup() {
  const order: string[] = [];
  const stored = new Map<string, Blob>();
  const api: SyncApi & { pages: SyncRow[][] } = {
    pages: [],
    async push(rows) {
      for (const row of rows) if (row.table === 'attachments') order.push(`push:${row.id}`);
      return { accepted: rows.map((r) => r.id), winners: [] };
    },
    async pull(cursor) {
      const rows = api.pages.shift() ?? [];
      return { rows, cursor: cursor + rows.length, hasMore: false };
    },
    async presign(items: PresignRequest['items']) {
      return { items: items.map(({ attachmentId, kind, mode }) => ({ attachmentId, kind, url: `https://files/${mode}/${attachmentId}/${kind}` })) };
    },
  };
  let failing: RegExp | null = null;
  const fetchFile = vi.fn(async (url: string, init?: RequestInit) => {
    if (failing?.test(url)) return new Response('', { status: 500 });
    const key = url.split('/').slice(-2).join('/');
    if (init?.method === 'PUT') {
      order.push(`put:${key}`);
      stored.set(key, init.body as Blob);
      return new Response('');
    }
    order.push(`get:${key}`);
    return new Response(stored.get(key) ?? new Blob(['downloaded'], { type: 'image/png' }));
  });
  vi.stubGlobal('fetch', fetchFile);
  return { api, order, stored, failOn: (pattern: RegExp | null) => (failing = pattern) };
}

beforeEach(async () => {
  await freshDatabase();
  await setMeta(META.accountId, 'me');
  await setMeta(META.tablesHash, SYNC_TABLES.join(','));
});
afterEach(() => vi.unstubAllGlobals());

it('uploads before pushing the row', async () => {
  const { api, order } = setup();
  await db.attachments.add(attachment('a1'));
  await syncNow(api);
  expect(order).toEqual(expect.arrayContaining(['put:a1/original', 'put:a1/thumb', 'push:a1']));
  expect(order.indexOf('push:a1')).toBeGreaterThan(order.indexOf('put:a1/original'));
  expect(order.indexOf('push:a1')).toBeGreaterThan(order.indexOf('put:a1/thumb'));
  expect(((await db.attachments.get('a1')) as unknown as Att).dirty).toBe(0);
});

it('a failed upload holds the row back and retries next sync', async () => {
  const { api, order, failOn } = setup();
  await db.attachments.add(attachment('a1'));
  failOn(/put/);
  const result = await syncNow(api);
  expect(result.status).toBe('done');
  expect(order).not.toContain('push:a1');
  expect(((await db.attachments.get('a1')) as unknown as Att).dirty).toBe(1);
  failOn(null);
  await syncNow(api);
  expect(order).toContain('push:a1');
});

it('downloads, then adds the attachment', async () => {
  const { api } = setup();
  api.pages.push([wire('a2')]);
  await syncNow(api);
  const row = (await db.attachments.get('a2')) as unknown as Att;
  expect(row).toBeDefined();
  expect(await row.blob.text()).toBe('downloaded');
  expect(row.thumbBlob).not.toBeNull();
  expect(row.dirty).toBe(0);
  expect(await db.syncPending.count()).toBe(0);
});

it('a failed download leaves it pending, and the rest of the sync still finishes', async () => {
  const { api, failOn } = setup();
  api.pages.push([
    wire('a3'),
    { table: 'areas', id: 'x1', updatedAt: now(), deletedAt: null, payload: { id: 'x1', name: 'Area', updatedAt: now(), deletedAt: null } },
  ]);
  failOn(/get/);
  expect((await syncNow(api)).status).toBe('done');
  expect(await db.attachments.get('a3')).toBeUndefined();
  expect(await db.syncPending.get('a3')).toBeDefined();
  expect(await db.areas.get('x1')).toBeDefined();
  failOn(null);
  await syncNow(api);
  expect(await db.attachments.get('a3')).toBeDefined();
  expect(await db.syncPending.get('a3')).toBeUndefined();
});

it('a file over MAX_FILE_BYTES stays on this device and is reported', async () => {
  const { api, order } = setup();
  await db.attachments.add(attachment('big', { size: MAX_FILE_BYTES + 1 }));
  const result = await syncNow(api);
  expect(result.skipped).toBe(1);
  expect(order).toEqual([]);
  expect(((await db.attachments.get('big')) as unknown as Att).dirty).toBe(1);
});

it('a soft-deleted attachment syncs without any file transfer', async () => {
  const { api, order } = setup();
  await db.attachments.add(attachment('gone', { deletedAt: now() }));
  await syncNow(api);
  expect(order).toEqual(['push:gone']);
});

it('an update to an attachment already here keeps its bytes', async () => {
  const { api, order } = setup();
  await db.attachments.add(attachment('a4'));
  await db.attachments.update('a4', { dirty: 0 } as never);
  api.pages.push([wire('a4', { nodeId: 'moved' })]);
  await syncNow(api);
  const row = (await db.attachments.get('a4')) as unknown as Att & { nodeId: string };
  expect(row.nodeId).toBe('moved');
  expect(await row.blob.text()).toBe('original!');
  expect(order.filter((step) => step.startsWith('get'))).toEqual([]);
});

it('a pulled deletion of an attachment not on this device needs no download', async () => {
  const { api, order } = setup();
  const t = now();
  api.pages.push([wire('a5', { deletedAt: t })]);
  api.pages[0]![0]!.deletedAt = t;
  await syncNow(api);
  expect(order).toEqual([]);
  expect(await db.syncPending.get('a5')).toBeUndefined();
});
