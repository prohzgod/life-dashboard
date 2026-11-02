// @vitest-environment node
import { SYNC_TABLES, type PullResponse, type SyncRow } from '@shared';
import { db } from '../db';
import { exportAll, importReplacingAll } from '../backup';
import { areasRepo, tasksRepo } from '../repositories';
import { freshDatabase } from '../testing';
import type { NewRecord } from '../repository';
import type { Task } from '../types';
import type { SyncApi } from './api';
import { hasOwnData, linkDevice, signOutDevice } from './link';
import { getMeta, META, setMeta } from './meta';

const me = { id: 'me', email: 'me@example.com' };
const newTask = (title = 'Mine') =>
  tasksRepo.create({ areaId: null, goalId: null, keyResultId: null, parentTaskId: null, title, notes: '', status: 'open', priority: null, doOn: null, time: null, dueAt: null, estimateMin: null, rrule: null, reminderAt: null, completedAt: null, sortKey: 'a0', repeatOfId: null } as NewRecord<Task>);

function wire(table: SyncRow['table'], id: string, fields: object = {}): SyncRow {
  const updatedAt = '2026-10-01T00:00:00.000Z';
  return { table, id, updatedAt, deletedAt: null, payload: { id, createdAt: updatedAt, updatedAt, deletedAt: null, ...fields } };
}

function fakeApi(pages: PullResponse[] = []): SyncApi & { pushed: SyncRow[] } {
  const api = {
    pushed: [] as SyncRow[],
    async push(rows: SyncRow[]) {
      api.pushed.push(...rows);
      return { accepted: rows.map((r) => r.id), winners: [] };
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
const account = (id: string) => [{ rows: [wire('areas', `${id}-area`, { name: 'Theirs', color: 'health', icon: null, sortKey: 'a0' })], cursor: 3, hasMore: false }];

/** Pretends this device was set up a while ago, so what it does next is your own. */
const ageSeeds = () => setMeta('seededAt', '2020-01-01T00:00:00.000Z');

beforeEach(freshDatabase);

describe('hasOwnData', () => {
  it('is false on a fresh device', async () => {
    expect(await hasOwnData()).toBe(false);
  });

  it('is true once you have added something', async () => {
    await ageSeeds();
    await db.transaction('rw', db.meta, () => db.meta.put({ key: 'seededAt', value: new Date(Date.now() - 3_600_000).toISOString() }));
    await newTask();
    expect(await hasOwnData()).toBe(true);
  });
});

describe('linkDevice', () => {
  it("a new device doesn't add a second set of seeded rows", async () => {
    const before = (await areasRepo.list()).length;
    expect(before).toBeGreaterThan(0);
    expect(await linkDevice(me, undefined, fakeApi(account('me')))).toBe('linked');
    expect((await areasRepo.list()).map((a) => a.id)).toEqual(['me-area']);
    expect(await getMeta(META.accountId)).toBe('me');
    expect(await getMeta(META.cursor)).toBe(3);
  });

  it('uploads this device when the account is empty', async () => {
    const api = fakeApi();
    expect(await linkDevice(me, undefined, api)).toBe('linked');
    expect(await getMeta(META.accountId)).toBe('me');
    expect((await areasRepo.list()).length).toBeGreaterThan(0);
  });

  it('asks when both have data, and changes nothing yet', async () => {
    await setMeta('seededAt', new Date(Date.now() - 3_600_000).toISOString());
    const task = await newTask();
    expect(await linkDevice(me, undefined, fakeApi(account('me')))).toBe('ask');
    expect(await db.tasks.get(task.id)).toBeDefined();
    expect(await getMeta(META.accountId)).toBeUndefined();
  });

  it('useAccount replaces only once everything has downloaded', async () => {
    const task = await newTask();
    const api = fakeApi([{ rows: [wire('areas', 'a1', { name: 'x' })], cursor: 1, hasMore: true }]);
    api.pull = async (cursor) => {
      if (cursor === 0) return { rows: [wire('areas', 'a1', { name: 'x' })], cursor: 1, hasMore: true };
      throw new TypeError('Failed to fetch');
    };
    await expect(linkDevice(me, 'useAccount', api)).rejects.toThrow();
    expect(await db.tasks.get(task.id)).toBeDefined();
    expect(await db.areas.get('a1')).toBeUndefined();
    expect(await getMeta(META.accountId)).toBeUndefined();
  });

  it('combine keeps both and marks local rows to send', async () => {
    const task = await newTask();
    await db.tasks.update(task.id, { dirty: 0 } as never);
    expect(await linkDevice(me, 'combine', fakeApi(account('me')))).toBe('linked');
    expect(await db.tasks.get(task.id)).toBeDefined();
    expect(((await db.tasks.get(task.id)) as unknown as { dirty: number }).dirty).toBe(1);
    expect(await getMeta(META.accountId)).toBe('me');
  });

  it("another account's data is never uploaded", async () => {
    await setMeta(META.ownerId, 'someone else');
    const theirs = await newTask('Their secret');
    const api = fakeApi();
    expect(await linkDevice(me, undefined, api)).toBe('confirmReplace');
    expect(api.pushed).toEqual([]);
    expect(await db.tasks.get(theirs.id)).toBeDefined();

    expect(await linkDevice(me, 'replaceOther', api)).toBe('linked');
    expect(api.pushed).toEqual([]);
    expect(await db.tasks.get(theirs.id)).toBeUndefined();
    expect((await tasksRepo.list()).every((t) => t.title !== 'Their secret')).toBe(true);
    expect(await getMeta(META.ownerId)).toBe('me');
    expect((await areasRepo.list()).length).toBeGreaterThan(0);
  });

  it('the same account signing back in carries on, with no prompt', async () => {
    await setMeta(META.ownerId, 'me');
    await setMeta(META.cursor, 42);
    await setMeta(META.tablesHash, SYNC_TABLES.join(','));
    const task = await newTask();
    expect(await linkDevice(me, undefined, fakeApi(account('me')))).toBe('linked');
    expect(await getMeta(META.cursor)).toBe(42);
    expect(await db.tasks.get(task.id)).toBeDefined();
  });
});

describe('signOutDevice', () => {
  const logout = async () => ({});
  beforeEach(async () => {
    await setMeta(META.accountId, 'me');
    await setMeta(META.ownerId, 'me');
    await setMeta(META.tablesHash, SYNC_TABLES.join(','));
  });

  it('keeps the data when asked, and remembers whose it is', async () => {
    const task = await newTask();
    expect(await signOutDevice({ removeData: false }, fakeApi(), logout)).toBe('done');
    expect(await db.tasks.get(task.id)).toBeDefined();
    expect(await getMeta(META.accountId)).toBeUndefined();
    expect(await getMeta(META.ownerId)).toBe('me');
  });

  it('removes the data when asked, and starts this device fresh', async () => {
    const task = await newTask();
    expect(await signOutDevice({ removeData: true }, fakeApi(), logout)).toBe('done');
    expect(await db.tasks.get(task.id)).toBeUndefined();
    expect(await getMeta(META.ownerId)).toBeUndefined();
    expect((await areasRepo.list()).length).toBeGreaterThan(0);
  });

  it('pushes first, and warns before removing changes it could not send', async () => {
    const task = await newTask();
    const api = fakeApi();
    api.push = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await signOutDevice({ removeData: true }, api, logout)).toBe('unsynced');
    expect(await db.tasks.get(task.id)).toBeDefined();
    expect(await getMeta(META.accountId)).toBe('me');
    expect(await signOutDevice({ removeData: true, force: true }, api, logout)).toBe('done');
    expect(await db.tasks.get(task.id)).toBeUndefined();
  });

  it('pushes what it can before signing out', async () => {
    const task = await newTask();
    const api = fakeApi();
    await signOutDevice({ removeData: false }, api, logout);
    expect(api.pushed.map((r) => r.id)).toContain(task.id);
  });
});

describe('restoring a backup', () => {
  it('a restored backup beats newer server rows when linked', async () => {
    const task = await newTask();
    const file = await exportAll();
    await setMeta(META.accountId, 'me');
    const before = Date.now();
    await importReplacingAll(file);
    const restored = await db.tasks.get(task.id);
    expect(new Date(restored!.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(((restored as unknown) as { dirty: number }).dirty).toBe(1);
  });

  it("rows missing from a restored backup don't come back", async () => {
    const file = await exportAll();
    const later = await newTask('Added after the backup');
    await setMeta(META.accountId, 'me');
    await importReplacingAll(file);
    const row = await db.tasks.get(later.id);
    expect(row?.deletedAt).not.toBeNull();
    expect(((row as unknown) as { dirty: number }).dirty).toBe(1);
    expect((await tasksRepo.list()).map((t) => t.id)).not.toContain(later.id);
  });

  it('import when not linked keeps original timestamps and removes other rows', async () => {
    const task = await newTask();
    const file = await exportAll();
    const later = await newTask('Added after the backup');
    await importReplacingAll(file);
    expect((await db.tasks.get(task.id))?.updatedAt).toBe(task.updatedAt);
    expect(await db.tasks.get(later.id)).toBeUndefined();
  });
});
