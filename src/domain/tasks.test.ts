import { compareForDay, countViews, doneByDay, groupByDay, inView, rhythmOf, rolledOverDays, sortForView, type TaskLike } from './tasks';

const today = '2026-10-26';
let n = 0;
const task = (over: Partial<TaskLike>): TaskLike => ({
  id: `t${n++}`,
  status: 'open',
  doOn: null,
  time: null,
  priority: null,
  sortKey: 'a0',
  parentTaskId: null,
  completedAt: null,
  completedOn: null,
  ...over,
});

describe('views', () => {
  const inbox = task({ status: 'inbox' });
  const dueToday = task({ doOn: today });
  const rolled = task({ doOn: '2026-10-24' });
  const later = task({ doOn: '2026-10-30' });
  const anytime = task({});
  const someday = task({ status: 'someday' });
  const doneToday = task({ status: 'done', doOn: today, completedAt: '2026-10-26T08:00:00Z', completedOn: today });
  const doneBefore = task({ status: 'done', completedAt: '2026-10-20T08:00:00Z', completedOn: '2026-10-20' });
  const subtask = task({ doOn: today, parentTaskId: 'x' });
  const all = [inbox, dueToday, rolled, later, anytime, someday, doneToday, doneBefore, subtask];
  const ids = (view: Parameters<typeof inView>[1]) => all.filter((t) => inView(t, view, today)).map((t) => t.id);

  it('puts each task in the right list', () => {
    expect(ids('inbox')).toEqual([inbox.id]);
    expect(ids('today')).toEqual([dueToday.id, rolled.id, doneToday.id]);
    expect(ids('upcoming')).toEqual([later.id]);
    expect(ids('anytime')).toEqual([anytime.id]);
    expect(ids('someday')).toEqual([someday.id]);
    expect(ids('logbook')).toEqual([doneToday.id, doneBefore.id]);
  });

  it('counts open work per view (Today without what is already done)', () => {
    expect(countViews(all, today)).toEqual({ inbox: 1, today: 2, upcoming: 1, anytime: 1, someday: 1, logbook: 2 });
  });

  it('measures roll-over', () => {
    expect(rolledOverDays(rolled, today)).toBe(2);
    expect(rolledOverDays(dueToday, today)).toBe(0);
    expect(rolledOverDays({ ...rolled, status: 'done' }, today)).toBe(0);
  });
});

describe('sorting', () => {
  it('orders a day by time, then priority, then manual order', () => {
    const a = task({ time: '18:00' });
    const b = task({ time: '07:00' });
    const c = task({ priority: 1, sortKey: 'a2' });
    const d = task({ sortKey: 'a1' });
    const e = task({ priority: 3, sortKey: 'a0' });
    expect([a, b, c, d, e].sort(compareForDay).map((t) => t.id)).toEqual([b.id, a.id, c.id, e.id, d.id]);
  });

  it('puts the newest done first in the logbook', () => {
    const old = task({ status: 'done', completedAt: '2026-10-01T00:00:00Z' });
    const fresh = task({ status: 'done', completedAt: '2026-10-25T00:00:00Z' });
    expect(sortForView([old, fresh], 'logbook')[0]).toBe(fresh);
  });

  it('groups upcoming by day', () => {
    const groups = groupByDay([task({ doOn: '2026-10-28' }), task({ doOn: '2026-10-27' }), task({ doOn: '2026-10-28' })]);
    expect(groups.map((g) => [g.day, g.tasks.length])).toEqual([
      ['2026-10-27', 1],
      ['2026-10-28', 2],
    ]);
  });
});

describe('doneByDay', () => {
  const done = (over: Partial<TaskLike>): TaskLike => ({ id: 'x', status: 'done', doOn: null, priority: null, sortKey: 'a', parentTaskId: null, completedAt: 'x', completedOn: null, ...over });

  it('counts finished top-level tasks per day', () => {
    const tasks = [done({ completedOn: '2026-10-26' }), done({ completedOn: '2026-10-26' }), done({ completedOn: '2026-10-27' }), done({ completedOn: '2026-10-27', parentTaskId: 'p' }), done({ status: 'open', completedOn: null })];
    expect(doneByDay(tasks, ['2026-10-26', '2026-10-27', '2026-10-28'])).toEqual([2, 1, 0]);
  });
});

describe('rhythmOf', () => {
  it('places a day in its week (Monday first), month and year', () => {
    expect(rhythmOf('2026-10-30')).toEqual({ weekDay: 5, monthDay: 30, monthDays: 31, yearDay: 303, yearDays: 365 });
    expect(rhythmOf('2028-02-29')).toMatchObject({ weekDay: 2, monthDays: 29, yearDay: 60, yearDays: 366 });
  });
});
