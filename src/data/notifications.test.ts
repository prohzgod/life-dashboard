// @vitest-environment node
import { saveDailyEntry } from './checkIns';
import { exportAllAsJson } from './backup';
import { collectDueReminders, getReminderPrefs, markRemindersFired, setReminderPrefs } from './notifications';
import { tasksRepo } from './repositories';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

const now = new Date(2026, 9, 29, 20, 30);

function task(title: string, reminderAt: string | null, status: 'open' | 'done' = 'open') {
  return tasksRepo.create({ areaId: null, goalId: null, keyResultId: null, parentTaskId: null, title, notes: '', status, priority: null, doOn: null, time: null, dueAt: null, estimateMin: null, rrule: null, reminderAt, completedAt: null, sortKey: 'a0', repeatOfId: null });
}

describe('notifications', () => {
  it('starts off, and keeps settings on this device only', async () => {
    expect((await getReminderPrefs()).enabled).toBe(false);
    await setReminderPrefs({ enabled: true, checkIn: { on: true, time: '20:00' } });
    const prefs = await getReminderPrefs();
    expect(prefs).toMatchObject({ enabled: true, tasks: true, checkIn: { on: true, time: '20:00' }, review: { weekday: 0 } });
    expect(await exportAllAsJson()).not.toContain('notifications.prefs');
  });

  it('collects due task and check-in reminders once each', async () => {
    await setReminderPrefs({ enabled: true, checkIn: { on: true, time: '20:00' } });
    const due = await task('Call the dentist', new Date(2026, 9, 29, 20, 0).toISOString());
    await task('Later', new Date(2026, 9, 29, 21, 0).toISOString());
    await task('Done already', new Date(2026, 9, 29, 19, 0).toISOString(), 'done');

    const first = await collectDueReminders(now);
    expect(first.map((r) => r.body)).toEqual(['Call the dentist', 'About 30 seconds: mood, energy and one line.']);
    expect(first[0]?.url).toBe(`/tasks/${due.id}`);

    await markRemindersFired(first.map((r) => r.key), now);
    expect(await collectDueReminders(now)).toEqual([]);
  });

  it('skips the check-in nudge once you have checked in, and hides details while locked', async () => {
    await setReminderPrefs({ enabled: true, checkIn: { on: true, time: '20:00' } });
    await task('Private thing', new Date(2026, 9, 29, 20, 0).toISOString());
    await saveDailyEntry('2026-10-29', { mood: 4 });
    const due = await collectDueReminders(now, true);
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({ kind: 'task', body: 'You have a reminder.' });
  });
});
