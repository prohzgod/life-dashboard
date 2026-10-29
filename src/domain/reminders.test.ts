import { DEFAULT_REMINDER_PREFS, dueReminders, firedToKeep, reviewWeekToNudge, type ReminderInput } from './reminders';

// Local times: the tests build Dates from local parts so they hold in any time zone.
const at = (h: number, m = 0, day = 29) => new Date(2026, 9, day, h, m);
const iso = (d: Date) => d.toISOString();

function input(patch: Partial<ReminderInput> = {}): ReminderInput {
  return {
    now: at(10),
    prefs: { ...DEFAULT_REMINDER_PREFS, enabled: true },
    tasks: [],
    checkedInToday: false,
    reviewDone: false,
    fired: {},
    hideDetails: false,
    ...patch,
  };
}

describe('dueReminders: tasks', () => {
  const task = { id: 't1', title: 'Call the dentist', status: 'open' as const, reminderAt: iso(at(9, 30)) };

  it('fires a task whose reminder time has come, naming the task', () => {
    const [r] = dueReminders(input({ tasks: [task] }));
    expect(r).toMatchObject({ kind: 'task', title: 'Reminder', body: 'Call the dentist', url: '/tasks/t1' });
    expect(r?.key).toBe(`task:t1:${task.reminderAt}`);
  });

  it('waits for reminders still ahead, and skips done ones', () => {
    expect(dueReminders(input({ tasks: [{ ...task, reminderAt: iso(at(10, 1)) }] }))).toEqual([]);
    expect(dueReminders(input({ tasks: [{ ...task, status: 'done' }] }))).toEqual([]);
    expect(dueReminders(input({ tasks: [{ ...task, reminderAt: null }] }))).toEqual([]);
  });

  it('fires each reminder once, and again if you move it', () => {
    const fired = { [`task:t1:${task.reminderAt}`]: iso(at(9, 30)) };
    expect(dueReminders(input({ tasks: [task], fired }))).toEqual([]);
    expect(dueReminders(input({ tasks: [{ ...task, reminderAt: iso(at(9, 45)) }], fired }))).toHaveLength(1);
  });

  it('still fires one missed while the app was closed, up to a day late', () => {
    expect(dueReminders(input({ tasks: [{ ...task, reminderAt: iso(at(11, 0, 28)) }] }))).toHaveLength(1);
    expect(dueReminders(input({ tasks: [{ ...task, reminderAt: iso(at(9, 0, 28)) }] }))).toEqual([]);
  });

  it('keeps the task name off the screen when asked, or while the app is locked', () => {
    const [r] = dueReminders(input({ tasks: [task], hideDetails: true }));
    expect(r).toMatchObject({ title: 'Life Dashboard', body: 'You have a reminder.' });
  });

  it('stays quiet when task reminders or notifications are off', () => {
    expect(dueReminders(input({ tasks: [task], prefs: { ...DEFAULT_REMINDER_PREFS, enabled: true, tasks: false } }))).toEqual([]);
    expect(dueReminders(input({ tasks: [task], prefs: DEFAULT_REMINDER_PREFS }))).toEqual([]);
  });
});

describe('dueReminders: check-in', () => {
  const prefs = { ...DEFAULT_REMINDER_PREFS, enabled: true, checkIn: { on: true, time: '20:00' } };

  it('nudges once the time has come, until you check in', () => {
    expect(dueReminders(input({ prefs, now: at(19, 59) }))).toEqual([]);
    const [r] = dueReminders(input({ prefs, now: at(20) }));
    expect(r).toMatchObject({ kind: 'check-in', key: 'check-in:2026-10-29', url: '/today' });
    expect(dueReminders(input({ prefs, now: at(21), checkedInToday: true }))).toEqual([]);
    expect(dueReminders(input({ prefs, now: at(21), fired: { 'check-in:2026-10-29': iso(at(20)) } }))).toEqual([]);
  });

  it('does not carry over to the next morning', () => {
    expect(dueReminders(input({ prefs, now: at(8, 0, 30) }))).toEqual([]);
  });
});

describe('dueReminders: weekly review', () => {
  const prefs = { ...DEFAULT_REMINDER_PREFS, enabled: true, tasks: false, review: { on: true, weekday: 0, time: '18:00' } };
  const sunday = (h: number) => new Date(2026, 10, 1, h);

  it('nudges on your review day after the time, while the review is not done', () => {
    expect(dueReminders(input({ prefs, now: sunday(17) }))).toEqual([]);
    expect(dueReminders(input({ prefs, now: sunday(18) }))[0]).toMatchObject({ kind: 'review', key: 'review:2026-11-01', url: '/review' });
    expect(dueReminders(input({ prefs, now: sunday(18), reviewDone: true }))).toEqual([]);
    expect(dueReminders(input({ prefs, now: at(18) }))).toEqual([]);
  });
});

describe('reviewWeekToNudge', () => {
  it('is the week ending today on Sunday, otherwise last week', () => {
    expect(reviewWeekToNudge('2026-11-01')).toBe('2026-10-26');
    expect(reviewWeekToNudge('2026-11-02')).toBe('2026-10-26');
    expect(reviewWeekToNudge('2026-10-31')).toBe('2026-10-19');
  });
});

describe('firedToKeep', () => {
  it('forgets reminders fired more than three days ago', () => {
    const kept = firedToKeep({ old: iso(at(9, 0, 25)), recent: iso(at(9, 0, 28)) }, at(10));
    expect(Object.keys(kept)).toEqual(['recent']);
  });
});
