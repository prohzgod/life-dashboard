// @vitest-environment node
import { MAX_ROW_BYTES, SYNC_TABLES, type PullResponse, type PushResponse, type SyncRow } from '@shared';
import { db } from '../db';
import { tasksRepo } from '../repositories';
import { freshDatabase } from '../testing';
import type { NewRecord } from '../repository';
import type { Task } from '../types';
import { SyncAuthError, SyncRequestError, type SyncApi } from './api';
import { syncNow, whileSyncPaused } from './engine';
import { readSyncState } from './state';
import { META, setMeta, getMeta } from './meta';
import { markClean } from './dirty';

const newTask = (title = 'A task') =>
  tasksRepo.create({ areaId: null, goalId: null, keyResultId: null, parentTaskId: null, title, notes: '', status: 'open', priority: null, doOn: null, time: null, dueAt: null, estimateMin: null, rrule: null, reminderAt: null, completedAt: null, sortKey: 'a0', repeatOfId: null } as NewRecord<Task>);
const dirtyOf = async (id: string) => ((await db.tasks.get(id)) as { dirty?: number } | undefined)?.dirty;

/** A stand-in for the server: remembers pushes and serves whatever pages it's given. */
function fakeApi(pages: PullResponse[] = []): SyncApi & { pushed: SyncRow[]; respond?: (rows: SyncRow[]) => PushResponse } {
  const api = {
    pushed: [] as SyncRow[],
    respond: undefined as undefined | ((rows: SyncRow[]) => PushResponse),
    async push(rows: SyncRow[]) {
      api.pushed.push(...rows);
      return api.respond ? api.respond(rows) : { accepted: rows.map((r) => r.id), winners: [] };
    },
    async pull(cursor: number) {
      return pages.shift() ?? { rows: [], cursor, hasMore: false };
    },
    async presign() {
      return { items: [] };
    },
  };
  return api;
}

function wire(id: string, title: string, updatedAt = new Date().toISOString()): SyncRow {
  const payload = { id, title, status: 'open', sortKey: 'a0', createdAt: updatedAt, updatedAt, deletedAt: null };
  return { table: 'tasks', id, updatedAt, deletedAt: null, payload };
}

beforeEach(async () => {
  await freshDatabase();
  await setMeta(META.accountId, 'me');
  await setMeta(META.tablesHash, SYNC_TABLES.join(','));
});

it('does nothing when no account is linked', async () => {
  await db.meta.delete(META.accountId);
  const api = fakeApi();
  expect((await syncNow(api)).status).toBe('signedOut');
  expect(api.pushed).toEqual([]);
});

it('pushes dirty rows and marks them clean only after the reply', async () => {
  const task = await newTask();
  let cleanDuringPush: number | undefined;
  const api = fakeApi();
  api.respond = (rows) => rows && { accepted: rows.map((r) => r.id), winners: [] };
  const push = api.push;
  api.push = async (rows) => {
    if (rows.some((r) => r.id === task.id)) cleanDuringPush = await dirtyOf(task.id);
    return push(rows);
  };
  const result = await syncNow(api);
  expect(result.status).toBe('done');
  expect(api.pushed.map((r) => r.id)).toContain(task.id);
  expect(cleanDuringPush).toBe(1);
  expect(await dirtyOf(task.id)).toBe(0);
});

it('a failed push leaves rows dirty and the cursor alone', async () => {
  const task = await newTask();
  await setMeta(META.cursor, 7);
  const api = fakeApi();
  api.push = async () => {
    throw new TypeError('Failed to fetch');
  };
  expect((await syncNow(api)).status).toBe('failed');
  expect(await dirtyOf(task.id)).toBe(1);
  expect(await getMeta(META.cursor)).toBe(7);
});

it('a pulled row never makes the row dirty, so it is not pushed back', async () => {
  const api = fakeApi([{ rows: [wire('from-server', 'Hello')], cursor: 5, hasMore: false }]);
  await syncNow(api);
  expect((await db.tasks.get('from-server'))?.title).toBe('Hello');
  expect(await dirtyOf('from-server')).toBe(0);
  const next = fakeApi();
  await syncNow(next);
  expect(next.pushed.map((r) => r.id)).not.toContain('from-server');
  expect(await getMeta(META.cursor)).toBe(5);
});

it('follows pages until there are no more', async () => {
  const api = fakeApi([
    { rows: [wire('p1', 'One')], cursor: 1, hasMore: true },
    { rows: [wire('p2', 'Two')], cursor: 2, hasMore: false },
  ]);
  expect((await syncNow(api)).pulled).toBe(2);
  expect(await db.tasks.get('p2')).toBeDefined();
});

it("a dirty local row isn't overwritten by a pull", async () => {
  const task = await newTask('Mine');
  const api = fakeApi([{ rows: [wire(task.id, 'Theirs')], cursor: 1, hasMore: false }]);
  api.push = async () => ({ accepted: [], winners: [] }); // the reply clears nothing, so it stays dirty
  await syncNow(api);
  expect((await db.tasks.get(task.id))?.title).toBe('Mine');
  expect(await dirtyOf(task.id)).toBe(1);
});

it('applies winners over a dirty row and clears it', async () => {
  const task = await newTask('Mine');
  const api = fakeApi();
  api.respond = () => ({ accepted: [], winners: [wire(task.id, 'Kept by the server')] });
  await syncNow(api);
  expect((await db.tasks.get(task.id))?.title).toBe('Kept by the server');
  expect(await dirtyOf(task.id)).toBe(0);
});

it('a row over MAX_ROW_BYTES is skipped and reported, and the rest still sync', async () => {
  const big = await newTask('x'.repeat(MAX_ROW_BYTES + 1));
  const small = await newTask('small');
  const api = fakeApi();
  const result = await syncNow(api);
  expect(result.status).toBe('done');
  expect(result.skipped).toBeGreaterThanOrEqual(1);
  expect(api.pushed.map((r) => r.id)).not.toContain(big.id);
  expect(api.pushed.map((r) => r.id)).toContain(small.id);
  expect(await dirtyOf(big.id)).toBe(1);
});

it('a 401 stops, keeps everything dirty, and reports needsSignIn', async () => {
  const task = await newTask();
  const api = fakeApi();
  api.push = async () => {
    throw new SyncAuthError();
  };
  expect((await syncNow(api)).status).toBe('signedOut');
  expect(await dirtyOf(task.id)).toBe(1);
  expect(await getMeta(META.accountId)).toBe('me');
});

it('normalizes a pulled row from an older device', async () => {
  const row = wire('old', 'Old');
  expect('time' in row.payload).toBe(false);
  await syncNow(fakeApi([{ rows: [row], cursor: 1, hasMore: false }]));
  expect((await db.tasks.get('old'))?.time).toBeNull();
});

it('re-pulls from 0 when SYNC_TABLES changes', async () => {
  await setMeta(META.cursor, 99);
  await setMeta(META.tablesHash, 'an older list');
  const seen: number[] = [];
  const api = fakeApi();
  api.pull = async (cursor) => {
    seen.push(cursor);
    return { rows: [], cursor, hasMore: false };
  };
  await syncNow(api);
  expect(seen).toEqual([0]);
  expect(await getMeta(META.tablesHash)).toBe(SYNC_TABLES.join(','));
});

it('runs one sync at a time', async () => {
  const task = await newTask();
  await markClean('tasks', task.id, task.updatedAt);
  let pulls = 0;
  const api = fakeApi();
  api.pull = async (cursor) => {
    pulls++;
    return { rows: [], cursor, hasMore: false };
  };
  await Promise.all([syncNow(api), syncNow(api)]);
  expect(pulls).toBe(1);
});

it('waits up to 90 seconds for a sleeping server', async () => {
  const { realApi } = await import('./api');
  const timeout = vi.spyOn(AbortSignal, 'timeout');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ rows: [], cursor: 0, hasMore: false }), { status: 200 })));
  await realApi.pull(0);
  expect(timeout).toHaveBeenCalledWith(90_000);
  vi.unstubAllGlobals();
  timeout.mockRestore();
});

it('turns a 401 into SyncAuthError', async () => {
  const { realApi } = await import('./api');
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
  await expect(realApi.pull(0)).rejects.toBeInstanceOf(SyncAuthError);
  vi.unstubAllGlobals();
});

describe('edits made while a push is under way', () => {
  it('a winner does not replace an edit made after the row was sent', async () => {
    const task = await newTask('v1');
    const api = fakeApi();
    api.push = async (rows) => {
      if (!rows.some((r) => r.id === task.id)) return { accepted: rows.map((r) => r.id), winners: [] };
      await tasksRepo.update(task.id, { title: 'v2, typed while waiting' });
      return { accepted: [], winners: [wire(task.id, 'server copy of v1')] };
    };
    await syncNow(api);
    expect((await db.tasks.get(task.id))?.title).toBe('v2, typed while waiting');
    expect(await dirtyOf(task.id)).toBe(1);
  });
});

describe('a row the server refuses', () => {
  it('does not stop the others, or the pull, and is reported', async () => {
    const bad = await newTask('Bad');
    const good = await newTask('Good');
    const api = fakeApi([{ rows: [wire('from-server', 'Hello')], cursor: 1, hasMore: false }]);
    const push = api.push;
    api.push = async (rows) => {
      if (rows.some((r) => r.id === bad.id)) throw new SyncRequestError(500, '');
      return push(rows);
    };
    const result = await syncNow(api);
    expect(result.status).toBe('done');
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(await dirtyOf(bad.id)).toBe(1);
    expect(await dirtyOf(good.id)).toBe(0);
    expect(await db.tasks.get('from-server')).toBeDefined();
    expect(await getMeta(META.stuck)).toBeGreaterThanOrEqual(1);
  });

  it('a row missing deletedAt still goes out', async () => {
    const api = fakeApi();
    await db.tasks.add({ id: 'damaged', title: 'From an old backup', updatedAt: new Date().toISOString(), createdAt: 'x' } as never);
    await syncNow(api);
    expect(api.pushed.find((r) => r.id === 'damaged')?.deletedAt).toBeNull();
  });
});

describe('when the session has ended', () => {
  it('stays waiting for sign-in instead of trying again, so the form stays put', async () => {
    await newTask();
    const api = fakeApi();
    let tries = 0;
    api.push = async () => {
      tries++;
      throw new SyncAuthError();
    };
    await syncNow(api);
    expect(readSyncState()).toBe('needsSignIn');
    const firstTries = tries;
    await syncNow(api);
    expect(tries).toBe(firstTries);
    expect(readSyncState()).toBe('needsSignIn');
  });
});

describe('sending the right account', () => {
  it('names the linked account on every sync request', async () => {
    const { realApi } = await import('./api');
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ rows: [], cursor: 0, hasMore: false }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await realApi.pull(0);
    expect((fetchMock.mock.calls[0]![1]!.headers as Record<string, string>)['x-sync-account']).toBe('me');
    vi.unstubAllGlobals();
  });

  it('treats a session for another account as needing sign-in, and sends nothing more', async () => {
    const { realApi } = await import('./api');
    await newTask();
    const fetchMock = vi.fn(async () => new Response('{}', { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await syncNow(realApi)).status).toBe('signedOut');
    expect(readSyncState()).toBe('needsSignIn');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('does not sync while a device is being switched', async () => {
    const api = fakeApi();
    await newTask();
    let during: number | undefined;
    await whileSyncPaused(async () => {
      await syncNow(api);
      during = api.pushed.length;
    });
    expect(during).toBe(0);
    await syncNow(api);
    expect(api.pushed.length).toBeGreaterThan(0);
  });
});

