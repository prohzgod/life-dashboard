// @vitest-environment node
import { decodeTime } from 'ulid';
import { db } from './db';
import { goalsRepo, spacesRepo, tasksRepo } from './repositories';
import { getCurrentSpaceId, setCurrentSpaceId } from './session';
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
  it('stamps a ULID, the current space and UTC timestamps on create', async () => {
    const before = Date.now();
    const created = await tasksRepo.create(task('Call Mom'));

    expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(decodeTime(created.id)).toBeGreaterThanOrEqual(before);
    expect(created.spaceId).toBe(getCurrentSpaceId());
    expect(created.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(created.updatedAt).toBe(created.createdAt);
    expect(created.deletedAt).toBeNull();
    expect(await tasksRepo.get(created.id)).toEqual(created);
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
    const sneaky = await tasksRepo.update(created.id, { id: 'other', spaceId: 'other' } as never);
    expect(sneaky.id).toBe(created.id);
    expect(sneaky.spaceId).toBe(created.spaceId);
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

  it('only reads records from the current space', async () => {
    const personal = getCurrentSpaceId();
    const mine = await tasksRepo.create(task('Mine'));
    const family = await spacesRepo.create({ name: 'Family', type: 'shared', spaceId: 'pending' });
    await tasksRepo.create(task('Shared', { spaceId: family.id }));

    expect((await tasksRepo.list()).map((t) => t.title)).toEqual(expect.arrayContaining(['Mine']));
    expect((await tasksRepo.list()).map((t) => t.title)).not.toContain('Shared');

    setCurrentSpaceId(family.id);
    expect((await tasksRepo.list()).map((t) => t.title)).toEqual(['Shared']);
    expect(await tasksRepo.get(mine.id)).toBeUndefined();
    setCurrentSpaceId(personal);
  });

  it('queries by index and by parent', async () => {
    const [root] = await goalsRepo.listRoots();
    const children = await goalsRepo.listChildren(root!.id);
    expect(children.map((g) => g.title)).toEqual(['Run 10 km without stopping']);
    expect(await goalsRepo.where('horizon', 'quarter')).toHaveLength(1);
  });
});
