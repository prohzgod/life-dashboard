// @vitest-environment node
import { db } from '../db';
import { nodesRepo } from '../repositories';
import { freshDatabase } from '../testing';
import { resolveDuplicates } from './duplicates';

const t1 = '2026-11-02T10:00:00.000Z';
const t2 = '2026-11-02T11:00:00.000Z';
const entry = (id: string, updatedAt: string, line: string) => ({ id, day: '2026-11-02', line, mood: null, energy: null, sleepMin: null, journalNodeId: null, createdAt: updatedAt, updatedAt, deletedAt: null }) as never;
const live = async <T extends { deletedAt: string | null }>(rows: Promise<T[]>) => (await rows).filter((r) => r.deletedAt === null);

beforeEach(freshDatabase);

it('merges two entries for one day into the lowest ID', async () => {
  await db.dailyEntries.bulkAdd([entry('B', t2, 'From the phone'), entry('A', t1, 'From the laptop')]);
  expect(await resolveDuplicates()).toBe(1);
  const rows = await live(db.dailyEntries.toArray());
  expect(rows.map((r) => r.id)).toEqual(['A']);
  expect(rows[0]!.line).toBe('From the phone');
});

it('sends the merge like any other change', async () => {
  await db.dailyEntries.bulkAdd([entry('A', t1, 'x'), entry('B', t2, 'y')]);
  await db.dailyEntries.toCollection().modify({ dirty: 0 } as never);
  await resolveDuplicates();
  const rows = (await db.dailyEntries.toArray()) as unknown as { dirty: number }[];
  expect(rows.every((r) => r.dirty === 1)).toBe(true);
});

it('repoints children: pages under a losing folder move to the winner', async () => {
  const folder = { parentId: null, kind: 'folder', title: 'Journal', contentJson: null, contentText: '', icon: null, isSystem: true, sortKey: 'a0', favoritedAt: null, areaId: null, goalId: null, systemKey: 'test-folder', createdAt: t1, updatedAt: t1, deletedAt: null };
  await db.nodes.bulkAdd([{ ...folder, id: 'F1' }, { ...folder, id: 'F2' }] as never);
  const child = await nodesRepo.create({ ...folder, parentId: 'F2', kind: 'page', systemKey: null, title: 'A page', isSystem: false } as never);
  await resolveDuplicates();
  expect((await db.nodes.get(child.id))?.parentId).toBe('F1');
  expect((await db.nodes.get('F2'))?.deletedAt).not.toBeNull();
});

it('leaves ordinary rows alone: two tasks with one title both stay', async () => {
  const task = { title: 'Same', status: 'open', sortKey: 'a0', createdAt: t1, updatedAt: t1, deletedAt: null };
  await db.tasks.bulkAdd([{ ...task, id: 'T1' }, { ...task, id: 'T2' }] as never);
  await resolveDuplicates();
  expect(await db.tasks.get('T1')).toMatchObject({ deletedAt: null });
  expect(await db.tasks.get('T2')).toMatchObject({ deletedAt: null });
});

it('does nothing to rows already deleted', async () => {
  await db.dailyEntries.bulkAdd([entry('A', t1, 'x'), { ...(entry('B', t2, 'y') as object), deletedAt: t2 } as never]);
  expect(await resolveDuplicates()).toBe(0);
  expect((await db.dailyEntries.get('A'))?.line).toBe('x');
});

it('two devices end up the same, whichever order rows arrived in', async () => {
  await db.dailyEntries.bulkAdd([entry('A', t1, 'x'), entry('B', t2, 'y')]);
  await resolveDuplicates();
  const first = (await db.dailyEntries.toArray()).map(({ id, line, updatedAt, deletedAt }) => ({ id, line, updatedAt, deletedAt }));
  await db.dailyEntries.clear();
  await db.dailyEntries.bulkAdd([entry('B', t2, 'y'), entry('A', t1, 'x')]);
  await resolveDuplicates();
  expect((await db.dailyEntries.toArray()).map(({ id, line, updatedAt, deletedAt }) => ({ id, line, updatedAt, deletedAt }))).toEqual(first);
});

it('a pull that brings a second set of seeded rows merges them', async () => {
  const widgets = await db.homeWidgets.toArray();
  const copy = widgets[0]!;
  await db.homeWidgets.add({ ...copy, id: '0000000000' + copy.id.slice(10) });
  await resolveDuplicates();
  const liveOfKind = (await live(db.homeWidgets.toArray())).filter((w) => w.kind === copy.kind);
  expect(liveOfKind).toHaveLength(1);
});
