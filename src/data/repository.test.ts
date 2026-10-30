// @vitest-environment node
import Dexie from 'dexie';
import { decodeTime } from 'ulid';
import { db, LifeDb } from './db';
import { goalsRepo, tasksRepo } from './repositories';
import { freshDatabase } from './testing';
import type { NewRecord } from './repository';
import type { Task } from './types';

const task = (title: string, extra: Partial<NewRecord<Task>> = {}): NewRecord<Task> => ({
  areaId: null,
  goalId: null,
  keyResultId: null,
  parentTaskId: null,
  title,
  notes: '',
  status: 'open',
  priority: null,
  doOn: null,
  time: null,
  dueAt: null,
  estimateMin: null,
  rrule: null,
  reminderAt: null,
  completedAt: null,
  sortKey: 'a0',
  repeatOfId: null,
  ...extra,
});

beforeEach(freshDatabase);

describe('createRepository', () => {
  it('stamps a ULID and UTC timestamps on create', async () => {
    const before = Date.now();
    const created = await tasksRepo.create(task('Call Mom'));

    expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(decodeTime(created.id)).toBeGreaterThanOrEqual(before);
    expect(created.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(created.updatedAt).toBe(created.createdAt);
    expect(created.deletedAt).toBeNull();
    expect(await tasksRepo.get(created.id)).toEqual(created);
  });

  it('stamps strictly increasing times, even within one millisecond', async () => {
    const many = await tasksRepo.bulkCreate([task('a')]);
    const stamps = [];
    for (let i = 0; i < 5; i++) stamps.push((await tasksRepo.update(many[0]!.id, { title: `v${i}` })).updatedAt);
    expect(new Set(stamps).size).toBe(5);
    expect([...stamps].sort()).toEqual(stamps);
  });

  it('creates ids that sort in creation order', async () => {
    const [a, b, c] = await tasksRepo.bulkCreate([task('a'), task('b'), task('c')]);
    expect([c!.id, a!.id, b!.id].sort()).toEqual([a!.id, b!.id, c!.id]);
  });

  it('updates user fields, bumps updatedAt and protects bookkeeping fields', async () => {
    const created = await tasksRepo.create(task('Draft'));
    await new Promise((r) => setTimeout(r, 2));
    const updated = await tasksRepo.update(created.id, { title: 'Draft essay #9', status: 'done' });

    expect(updated.title).toBe('Draft essay #9');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    // A patch can't smuggle in bookkeeping fields.
    const sneaky = await tasksRepo.update(created.id, { id: 'other', createdAt: 'other' } as never);
    expect(sneaky.id).toBe(created.id);
    expect(sneaky.createdAt).toBe(created.createdAt);
  });

  it('soft-deletes: the row stays but disappears from reads, and can be restored', async () => {
    const keep = await tasksRepo.create(task('Keep'));
    const bin = await tasksRepo.create(task('Bin'));
    await tasksRepo.remove(bin.id);

    expect(await tasksRepo.get(bin.id)).toBeUndefined();
    expect((await tasksRepo.list()).map((t) => t.title)).toContain('Keep');
    expect((await tasksRepo.list()).map((t) => t.title)).not.toContain('Bin');
    expect((await tasksRepo.listDeleted()).map((t) => t.id)).toEqual([bin.id]);

    const raw = await db.tasks.get(bin.id);
    expect(raw?.deletedAt).not.toBeNull();
    expect(raw?.updatedAt).toBe(raw?.deletedAt);

    await tasksRepo.restore(bin.id);
    expect(await tasksRepo.get(bin.id)).toMatchObject({ title: 'Bin', deletedAt: null });
    expect(await tasksRepo.get(keep.id)).toBeDefined();
  });

  it('refuses to update a deleted or missing record', async () => {
    const created = await tasksRepo.create(task('Gone'));
    await tasksRepo.remove(created.id);
    await expect(tasksRepo.update(created.id, { title: 'Back?' })).rejects.toThrow(/No tasks record/);
    await expect(tasksRepo.update('missing', { title: 'x' })).rejects.toThrow();
  });

  it('queries by index and by parent', async () => {
    const [root] = await goalsRepo.listRoots();
    const children = await goalsRepo.listChildren(root!.id);
    expect(children.map((g) => g.title)).toEqual(['Run 10 km without stopping']);
    expect(await goalsRepo.where('horizon', 'quarter')).toHaveLength(1);
  });
});

describe('schema v8 → v9', () => {
  it('drops spaces and the spaceId on every row', async () => {
    const name = 'migration-v9-test';
    const v8 = new Dexie(name);
    v8.version(8).stores({
      spaces: 'id, type, updatedAt',
      dailyEntries: 'id, spaceId, day, [spaceId+day], updatedAt',
      tasks: 'id, spaceId, areaId, goalId, keyResultId, parentTaskId, status, doOn, dueAt, updatedAt',
      meta: 'key',
    });
    await v8.table('spaces').add({ id: 's', spaceId: 's', name: 'Personal', type: 'personal', deletedAt: null });
    await v8.table('tasks').add({ id: 'old', title: 'Old task', spaceId: 's', time: null, repeatOfId: null, deletedAt: null });
    await v8.table('dailyEntries').add({ id: 'd', spaceId: 's', day: '2026-10-29', deletedAt: null });
    await v8.table('meta').bulkAdd([{ key: 'currentSpaceId', value: 's' }, { key: 'seededAt', value: '2026-01-01T00:00:00.000Z' }]);
    v8.close();

    const upgraded = new LifeDb(name);
    expect(await upgraded.tasks.get('old')).not.toHaveProperty('spaceId');
    expect(await upgraded.dailyEntries.where('day').equals('2026-10-29').count()).toBe(1);
    expect(upgraded.tables.map((t) => t.name)).not.toContain('spaces');
    expect(await upgraded.meta.get('currentSpaceId')).toBeUndefined();
    expect(await upgraded.meta.get('seededAt')).toBeDefined();
    upgraded.close();
    await Dexie.delete(name);
  });
});
