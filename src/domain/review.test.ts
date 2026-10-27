import { draftSummary, goalsThatMoved, habitConsistencyBetween, minutesLeft, reviewWeekFor, summarizeWeek, type HabitData } from './review';

const week = '2026-10-19'; // Monday
const daily: HabitData['input'] = { kind: 'yesno', target: 1, schedule: { type: 'daily' }, startDay: '2026-01-01' };

describe('reviewWeekFor', () => {
  it('reviews the week ending today on Sunday, else last week until it is done', () => {
    expect(reviewWeekFor('2026-10-25', () => false)).toBe('2026-10-19');
    expect(reviewWeekFor('2026-10-27', () => false)).toBe('2026-10-19');
    expect(reviewWeekFor('2026-10-27', (w) => w === '2026-10-19')).toBe('2026-10-26');
  });
});

describe('summarizeWeek', () => {
  const entries = [
    { day: '2026-10-19', mood: 3, energy: 3, sleepMinutes: 400, line: 'ok', photoId: null },
    { day: '2026-10-21', mood: 2, energy: 2, sleepMinutes: 340, line: '', photoId: null },
    { day: '2026-10-24', mood: 5, energy: 5, sleepMinutes: 480, line: 'Long run, then a hike with Linh.', photoId: 'p' },
    { day: '2026-10-25', mood: 5, energy: 4, sleepMinutes: 450, line: '', photoId: null },
    { day: '2026-10-12', mood: 1, energy: 1, sleepMinutes: 200, line: 'last week', photoId: null },
  ];
  const completedDays = ['2026-10-19', '2026-10-20', '2026-10-20', '2026-10-24', '2026-10-13'];
  const habit: HabitData = {
    id: 'h',
    title: 'Meditate',
    input: daily,
    logs: ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-23', '2026-10-24'].map((day) => ({ day, value: 1, status: 'done' as const })),
  };

  it('counts the week’s tasks, habits, mood, sleep and journal days', () => {
    const s = summarizeWeek({ weekStart: week, today: '2026-10-27', completedDays, habits: [habit], entries });
    expect(s).toMatchObject({ tasksDone: 4, tasksDelta: 3, journalDays: 4 });
    expect(s.habitConsistency).toBeCloseTo(5 / 7);
    expect(s.avgMood).toBeCloseTo(3.75);
    expect(s.avgSleepMinutes).toBeCloseTo(417.5);
    expect(s.days.map((d) => d.mood)).toEqual([3, null, 2, null, null, 5, 5]);
  });

  it('picks the best day by mood, then energy', () => {
    const s = summarizeWeek({ weekStart: week, today: '2026-10-27', completedDays, habits: [habit], entries });
    expect(s.bestDay?.day).toBe('2026-10-24');
  });

  it('writes a draft summary from the numbers', () => {
    const s = summarizeWeek({ weekStart: week, today: '2026-10-27', completedDays, habits: [habit], entries });
    const moves = goalsThatMoved([
      { id: 'a', title: 'Run a half-marathon', weekAgo: 58, now: 62, twoWeeksAgo: 55, active: true },
      { id: 'b', title: 'Ship side project v1', weekAgo: 55, now: 55, twoWeeksAgo: 55, active: true },
    ]);
    expect(draftSummary(s, moves)).toBe(
      'You finished 4 tasks (3 more than the week before) and kept your habits at 71%. Saturday was your best day. Wednesday was harder. Run a half-marathon moved forward. Ship side project v1 hasn’t moved in two weeks: worth one protected block, or a conscious pause.',
    );
  });

  it('is gentle about an empty week', () => {
    const s = summarizeWeek({ weekStart: week, today: '2026-10-27', completedDays: [], habits: [], entries: [] });
    expect(draftSummary(s, [])).toBe('A quiet week on paper.');
  });
});

describe('goalsThatMoved', () => {
  it('lists movers first, then stalled goals, and skips the rest', () => {
    const moves = goalsThatMoved([
      { id: 'stalled', title: 'S', weekAgo: 40, now: 40, twoWeeksAgo: 40, active: true },
      { id: 'small', title: 'A', weekAgo: 10, now: 12, twoWeeksAgo: 8, active: true },
      { id: 'big', title: 'B', weekAgo: 10, now: 20, twoWeeksAgo: 8, active: true },
      { id: 'done', title: 'D', weekAgo: 100, now: 100, twoWeeksAgo: 100, active: true },
      { id: 'idle-ok', title: 'I', weekAgo: 30, now: 30, twoWeeksAgo: 20, active: true },
    ]);
    expect(moves.map((m) => m.id)).toEqual(['big', 'small', 'stalled']);
  });
});

describe('helpers', () => {
  it('measures habit consistency over a range, up to today', () => {
    const habit: HabitData = { id: 'h', title: 'x', input: daily, logs: [{ day: '2026-10-19', value: 1, status: 'done' }] };
    expect(habitConsistencyBetween([habit], '2026-10-19', '2026-10-25', '2026-10-21')).toEqual({ done: 1, counted: 2 });
  });

  it('estimates minutes left', () => {
    expect(minutesLeft(1)).toBe(17);
    expect(minutesLeft(3)).toBe(10);
    expect(minutesLeft(5)).toBe(1);
  });
});
