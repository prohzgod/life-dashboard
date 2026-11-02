// @vitest-environment node
import Dexie from 'dexie';
import { db, LifeDb } from '../db';
import { exportAll, importReplacingAll, parseExport } from '../backup';
import { tasksRepo } from '../repositories';
import { dataTableNames } from '../db';
import { freshDatabase } from '../testing';
import type { NewRecord } from '../repository';
import type { Task } from '../types';
import { applyingPull, listDirty, markClean } from './dirty';

type Dirty = { dirty?: number };
const dirtyOf = async (id: string) => ((await db.tasks.get(id)) as Dirty | undefined)?.dirty;
const newTask = () => tasksRepo.create({ areaId: null, goalId: null, keyResultId: null, parentTaskId: null, title: 'A task', notes: '', status: 'open', priority: null, doOn: null, time: null, dueAt: null, estimateMin: null, rrule: null, reminderAt: null, completedAt: null, sortKey: 'a0', repeatOfId: null } as NewRecord<Task>);

beforeEach(freshDatabase);

it('a new row is dirty', async () => {
  const task = await newTask();
  expect(await dirtyOf(task.id)).toBe(1);
  expect((await listDirty('tasks', 10)).map((r) => r.id)).toContain(task.id);
});

it('an edit makes a clean row dirty', async () => {
  const task = await newTask();
  await markClean('tasks', task.id, task.updatedAt);
  expect(await dirtyOf(task.id)).toBe(0);
  await tasksRepo.update(task.id, { title: 'Changed' });
  expect(await dirtyOf(task.id)).toBe(1);
});

it('a soft delete makes it dirty', async () => {
  const task = await newTask();
  await markClean('tasks', task.id, task.updatedAt);
  await tasksRepo.remove(task.id);
  expect(await dirtyOf(task.id)).toBe(1);
});

it('a pulled row stays clean, new or replacing a clean one', async () => {
  const task = await newTask();
  await markClean('tasks', task.id, task.updatedAt);
  await applyingPull(['tasks'], async () => {
    await db.tasks.put({ ...task, title: 'From another device', dirty: 0 } as typeof task);
    await db.tasks.put({ ...task, id: 'pulled', dirty: 0 } as typeof task);
  });
  expect(await dirtyOf(task.id)).toBe(0);
  expect(await dirtyOf('pulled')).toBe(0);
  expect((await db.tasks.get(task.id))?.title).toBe('From another device');
});

it('a stale write of a clean copy cannot clear the flag', async () => {
  const task = await newTask();
  await markClean('tasks', task.id, task.updatedAt);
  const stale = await db.tasks.get(task.id);
  await tasksRepo.update(task.id, { title: 'First edit' });
  await db.tasks.put({ ...stale!, title: 'Second edit' });
  expect(await dirtyOf(task.id)).toBe(1);
});

it('markClean leaves a row edited since the push dirty', async () => {
  const task = await newTask();
  await new Promise((resolve) => setTimeout(resolve, 2));
  await tasksRepo.update(task.id, { title: 'Edited after the push' });
  await markClean('tasks', task.id, task.updatedAt);
  expect(await dirtyOf(task.id)).toBe(1);
});

it('upgrading from version 9 keeps rows and marks them dirty', async () => {
  const name = 'upgrade-test';
  await Dexie.delete(name);
  const old = new Dexie(name);
  old.version(9).stores({ ...Object.fromEntries(dataTableNames.map((table) => [table, 'id'])), meta: 'key' });
  await old.open();
  await old.table('tasks').add({ id: 'old', title: 'Kept', updatedAt: 'x', deletedAt: null });
  old.close();
  const upgraded = new LifeDb(name);
  await upgraded.open();
  const row = (await upgraded.tasks.get('old')) as (Dirty & { title: string }) | undefined;
  expect(row?.title).toBe('Kept');
  expect(row?.dirty).toBe(1);
  upgraded.close();
  await Dexie.delete(name);
});

it('exports leave dirty out, and an import ignores one in a file', async () => {
  const task = await newTask();
  const file = await exportAll();
  const exported = (file.tables.tasks ?? []) as Array<Dirty & { id: string }>;
  expect(exported.find((r) => r.id === task.id)).not.toHaveProperty('dirty');
  await markClean('tasks', task.id, task.updatedAt);
  const withFlag = JSON.parse(JSON.stringify(file));
  withFlag.tables.tasks.find((r: { id: string }) => r.id === task.id).dirty = 0;
  await importReplacingAll(parseExport(JSON.stringify(withFlag)));
  expect(await dirtyOf(task.id)).toBe(1);
});
