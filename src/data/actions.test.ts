// @vitest-environment node
import Dexie from 'dexie';
import { toDay } from '@/domain/days';
import { getDailyEntry, onThisDay, saveDailyEntry, savePhotoOfTheDay } from './checkIns';
import { LifeDb } from './db';
import { listFocusGoals } from './goalQueries';
import { listHabitsWithSummaries, skipHabitDay, tapHabit } from './habitActions';
import { goalsRepo, habitsRepo, tasksRepo } from './repositories';
import {
  acceptInboxTask,
  addSubtask,
  captureTask,
  completeTask,
  deleteTask,
  listTaskTags,
  moveRolledOverToToday,
  reopenTask,
  setTaskTags,
  suggestForInbox,
  tagsForTask,
} from './taskActions';
import { areasRepo } from './repositories';
import { freshDatabase } from './testing';

const today = '2026-10-26'; // Monday

beforeEach(freshDatabase);

describe('captureTask', () => {
  it('turns a quick-add line into a task with area, repeat, priority and tags', async () => {
    const task = await captureTask('Pay rent every 1st #finance !high #bills', { today, status: 'inbox' });
    const finance = (await areasRepo.list()).find((a) => a.name === 'Finance')!;
    expect(task).toMatchObject({
      title: 'Pay rent',
      status: 'inbox',
      areaId: finance.id,
      priority: 1,
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      doOn: '2026-11-01',
    });
    expect((await tagsForTask(task.id)).map((t) => t.name)).toEqual(['bills']);
  });

  it('uses the default day only when the text names none, and keeps the time', async () => {
    expect((await captureTask('Call Mom at 18:00', { today, status: 'open', defaultDoOn: today })).time).toBe('18:00');
    expect((await captureTask('Water plants', { today, status: 'open', defaultDoOn: today })).doOn).toBe(today);
    expect((await captureTask('Dentist friday', { today, status: 'open', defaultDoOn: today })).doOn).toBe('2026-10-30');
  });

  it('turns "by …" into a 17:00 local deadline', async () => {
    const task = await captureTask('Renew insurance by friday', { today, status: 'inbox' });
    const due = new Date(task.dueAt!);
    expect([due.getFullYear(), due.getMonth() + 1, due.getDate(), due.getHours()]).toEqual([2026, 10, 30, 17]);
  });

  it('files "someday" items under Someday', async () => {
    expect((await captureTask('Learn the cello someday', { today, status: 'open', defaultDoOn: today })).status).toBe('someday');
  });

  it('appends new tasks at the end of the manual order', async () => {
    const a = await captureTask('A', { today, status: 'open' });
    const b = await captureTask('B', { today, status: 'open' });
    expect(b.sortKey > a.sortKey).toBe(true);
  });
});

describe('repeating tasks', () => {
  it('creates the next occurrence when done, and takes it back when un-checked', async () => {
    const task = await captureTask('Call Mom every Tuesday #errand', { today, status: 'open' });
    expect(task.doOn).toBe('2026-10-27');

    await completeTask(task.id, '2026-10-27');
    const [next] = await tasksRepo.list((t) => t.repeatOfId === task.id);
    expect(next).toMatchObject({ title: 'Call Mom', status: 'open', doOn: '2026-11-03', rrule: task.rrule });
    expect((await tagsForTask(next!.id)).map((t) => t.name)).toEqual(['errand']);

    // Completing twice doesn't make a second copy.
    await completeTask(task.id, '2026-10-27');
    expect(await tasksRepo.list((t) => t.repeatOfId === task.id)).toHaveLength(1);

    await reopenTask(task.id);
    expect((await tasksRepo.get(task.id))!.status).toBe('open');
    expect(await tasksRepo.list((t) => t.repeatOfId === task.id)).toHaveLength(0);
  });

  it('counts "every 3 days" from the day it was done', async () => {
    const task = await captureTask('Water the plants every 3 days', { today, status: 'open' });
    await completeTask(task.id, '2026-10-28');
    expect((await tasksRepo.list((t) => t.repeatOfId === task.id))[0]!.doOn).toBe('2026-10-31');
  });

  it('keeps a next occurrence that was already done', async () => {
    const task = await captureTask('Stretch every day', { today, status: 'open' });
    await completeTask(task.id, today);
    const [next] = await tasksRepo.list((t) => t.repeatOfId === task.id);
    await completeTask(next!.id, '2026-10-27');
    await reopenTask(task.id);
    expect((await tasksRepo.get(next!.id))!.status).toBe('done');
  });
});

describe('other task actions', () => {
  it('moves rolled-over tasks onto today', async () => {
    await captureTask('Old one', { today: '2026-10-20', status: 'open', defaultDoOn: '2026-10-20' });
    await captureTask('Future', { today, status: 'open', defaultDoOn: '2026-10-30' });
    expect(await moveRolledOverToToday(today)).toBe(1);
    expect((await tasksRepo.list((t) => t.title === 'Old one'))[0]!.doOn).toBe(today);
  });

  it('suggests and accepts an Inbox destination', async () => {
    const areas = await areasRepo.listOrdered();
    const rent = await captureTask('Renew car insurance', { today, status: 'inbox' });
    const idea = await captureTask('Idea: photo book for Mom', { today, status: 'inbox' });

    const s1 = suggestForInbox(rent, areas);
    expect(s1).toMatchObject({ status: 'open', area: { name: 'Finance' } });
    expect(suggestForInbox(idea, areas)).toMatchObject({ status: 'someday', area: { name: 'Family' } });

    await acceptInboxTask(rent, s1);
    expect(await tasksRepo.get(rent.id)).toMatchObject({ status: 'open', areaId: s1.area!.id });
  });

  it('deletes a task with its subtasks and tags', async () => {
    const parent = await captureTask('Pay rent #bills', { today, status: 'open' });
    const sub = await addSubtask(parent, 'Check balance');
    await deleteTask(parent.id);
    expect(await tasksRepo.get(parent.id)).toBeUndefined();
    expect(await tasksRepo.get(sub.id)).toBeUndefined();
    expect(await listTaskTags()).toEqual([]);
  });

  it('replaces tags and lists only tags in use', async () => {
    const task = await captureTask('Buy stamps #errand', { today, status: 'open' });
    await setTaskTags(task.id, ['#Errand', 'post', 'post']);
    expect((await tagsForTask(task.id)).map((t) => t.name).sort()).toEqual(['errand', 'post']);
    await setTaskTags(task.id, ['post']);
    expect((await listTaskTags()).map((t) => [t.name, t.count])).toEqual([['post', 1]]);
  });
});

describe('habits', () => {
  // Seeded habits start on the real today, so these tests use it too.
  const today = toDay(new Date());

  it('taps a yes/no habit on and off', async () => {
    const meditate = (await habitsRepo.list()).find((h) => h.title === 'Meditate')!;
    await tapHabit(meditate, today);
    let [summary] = await listHabitsWithSummaries(today);
    expect(summary!.summary.todayDone).toBe(true);
    await tapHabit(meditate, today);
    [summary] = await listHabitsWithSummaries(today);
    expect(summary!.summary.todayDone).toBe(false);
  });

  it('counts water glass by glass, then clears the day', async () => {
    const water = (await habitsRepo.list()).find((h) => h.title === 'Water')!;
    for (let i = 0; i < 7; i++) await tapHabit(water, today);
    const summary = async () => (await listHabitsWithSummaries(today)).find((h) => h.habit.id === water.id)!.summary;
    expect(await summary()).toMatchObject({ todayValue: 7, todayDone: false });
    await tapHabit(water, today);
    expect(await summary()).toMatchObject({ todayValue: 8, todayDone: true });
    await tapHabit(water, today);
    expect(await summary()).toMatchObject({ todayValue: 0, todayDone: false });
  });

  it('can skip a day on purpose', async () => {
    const meditate = (await habitsRepo.list()).find((h) => h.title === 'Meditate')!;
    await skipHabitDay(meditate, today);
    const [summary] = await listHabitsWithSummaries(today);
    expect(summary!.summary.last7.at(-1)!.state).toBe('skipped');
  });
});

describe('check-ins', () => {
  it('creates the day’s entry on first save and updates it after', async () => {
    await saveDailyEntry(today, { mood: 4 });
    await saveDailyEntry(today, { energy: 3, line: 'Slow morning, good run.' });
    expect(await getDailyEntry(today)).toMatchObject({ mood: 4, energy: 3, line: 'Slow morning, good run.', sleepMinutes: null });
  });

  it('replaces the photo of the day', async () => {
    const first = await savePhotoOfTheDay(today, { blob: new Blob(['a'], { type: 'image/jpeg' }), thumbBlob: null, width: 1, height: 1 });
    const second = await savePhotoOfTheDay(today, { blob: new Blob(['b'], { type: 'image/jpeg' }), thumbBlob: null, width: 1, height: 1 });
    expect((await getDailyEntry(today))!.photoId).toBe(second.id);
    expect(first.id).not.toBe(second.id);
  });

  it('finds the latest memory on this day in an earlier year', async () => {
    expect(await onThisDay(today)).toBeNull();
    await saveDailyEntry('2024-10-26', { line: 'Two years ago' });
    await saveDailyEntry('2025-10-26', { line: 'First long run after the injury. 8 km, no pain.' });
    await saveDailyEntry('2025-10-25', { line: 'Wrong day' });
    await saveDailyEntry('2023-10-26', { mood: 3 }); // nothing to show
    const memory = await onThisDay(today);
    expect(memory).toMatchObject({ yearsAgo: 1, entry: { line: 'First long run after the injury. 8 km, no pain.' } });
  });
});

describe('focus goals', () => {
  it('falls back to the nearest horizon until a review picks week goals', async () => {
    const focus = await listFocusGoals(today);
    expect(focus.fromReview).toBe(false);
    expect(focus.goals.map((g) => g.horizon)).toEqual(['quarter']);

    const [year] = await goalsRepo.listRoots();
    await goalsRepo.create({ ...year!, id: undefined, horizon: 'week', title: 'Run 3× this week', startDate: '2026-10-26', endDate: '2026-11-01' });
    expect((await listFocusGoals(today)).goals.map((g) => g.title)).toEqual(['Run 3× this week']);
  });
});

describe('schema v1 → v2', () => {
  it('fills in the new task fields on upgrade', async () => {
    const name = 'migration-test';
    const v1 = new Dexie(name);
    v1.version(1).stores({ tasks: 'id, spaceId, areaId, goalId, keyResultId, parentTaskId, status, doOn, dueAt, updatedAt' });
    await v1.table('tasks').add({ id: 'old', title: 'Old task', spaceId: 's', deletedAt: null });
    v1.close();

    const db = new LifeDb(name);
    expect(await db.tasks.get('old')).toMatchObject({ title: 'Old task', time: null, repeatOfId: null });
    db.close();
    await Dexie.delete(name);
  });
});
