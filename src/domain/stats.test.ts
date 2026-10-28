import { addDays } from './days';
import { findPatterns, habitHeatmap, periodLabel, periodRange, periodStats, shiftPeriod, yearPixels } from './stats';
import type { HabitData } from './review';

const daily: HabitData['input'] = { kind: 'yesno', target: 1, schedule: { type: 'daily' }, startDay: '2026-01-01' };

describe('periods', () => {
  it('finds ranges, labels and neighbours', () => {
    expect(periodRange('week', '2026-10-28')).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    expect(periodRange('month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('year', '2026-06-01')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(periodLabel('week', '2026-10-28')).toBe('Week 44, 26 Oct – 1 Nov');
    expect(periodLabel('month', '2026-10-28')).toBe('October 2026');
    expect(periodLabel('day', '2026-10-28')).toBe('Wed 28 Oct');
    expect(shiftPeriod('month', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftPeriod('month', '2026-01-15', -1)).toBe('2025-12-15');
    expect(shiftPeriod('year', '2028-02-29', 1)).toBe('2029-02-28');
  });
});

describe('yearPixels', () => {
  it('lays out 12 months of up to 31 days with moods', () => {
    const grid = yearPixels(2026, [{ day: '2026-02-03', mood: 4, energy: 3, sleepMinutes: null, line: '', photoId: null }]);
    expect(grid).toHaveLength(12);
    expect(grid[1]![2]).toEqual({ day: '2026-02-03', mood: 4 });
    expect(grid[1]![28]).toBeNull(); // 29 Feb 2026 doesn't exist
    expect(grid[0]![0]).toEqual({ day: '2026-01-01', mood: null });
  });
});

describe('habitHeatmap', () => {
  it('shades each day by the share of habits done, in Monday-first weeks', () => {
    const a: HabitData = { id: 'a', title: 'A', input: daily, logs: [{ day: '2026-10-26', value: 1, status: 'done' }, { day: '2026-10-27', value: 1, status: 'done' }] };
    const b: HabitData = { id: 'b', title: 'B', input: daily, logs: [{ day: '2026-10-27', value: 1, status: 'done' }] };
    const weeks = habitHeatmap([a, b], '2026-10-26', '2026-11-01', '2026-10-28');
    expect(weeks).toHaveLength(1);
    expect(weeks[0]!.map((c) => c?.level ?? null)).toEqual([2, 4, 0, null, null, null, null]);
  });
});

describe('periodStats', () => {
  it('sums up a period', () => {
    const habit: HabitData = { id: 'h', title: 'Meditate', input: daily, logs: ['2026-10-26', '2026-10-27'].map((day) => ({ day, value: 1, status: 'done' as const })) };
    const stats = periodStats({
      from: '2026-10-26',
      to: '2026-11-01',
      today: '2026-10-28',
      completedDays: ['2026-10-26', '2026-10-27', '2026-10-27', '2026-10-20'],
      habits: [habit],
      entries: [
        { day: '2026-10-26', mood: 4, energy: 3, sleepMinutes: 450, line: '', photoId: null },
        { day: '2026-10-27', mood: 3, energy: 3, sleepMinutes: 380, line: '', photoId: null },
      ],
      reviewedWeeks: ['2026-10-19', '2026-10-26'],
    });
    expect(stats).toMatchObject({ tasksDone: 3, bestHabit: { title: 'Meditate', consistency: 1 }, avgMood: 3.5, avgSleepMinutes: 415, nightsOver7h: 0.5, reviewsDone: 1 });
    expect(stats.tasksPerDay).toBe(1);
    expect(stats.habitConsistency).toBe(1);
    // The week of 26 Oct hasn't ended on the 28th, so there's nothing to review yet.
    expect(stats.reviewWeeks).toBe(0);
  });

  it('counts review weeks only from when you started', () => {
    const base = { today: '2026-10-28', completedDays: [], habits: [], entries: [], reviewedWeeks: ['2026-10-19'] };
    expect(periodStats({ ...base, from: '2026-01-01', to: '2026-12-31' }).reviewWeeks).toBe(43);
    expect(periodStats({ ...base, from: '2026-01-01', to: '2026-12-31', since: '2026-10-14' })).toMatchObject({ reviewWeeks: 2, reviewsDone: 1 });
  });
});

describe('findPatterns', () => {
  const today = '2026-10-28';

  it('stays quiet without enough data', () => {
    expect(findPatterns({ today, entries: [], completedDays: [], habits: [], reviewedWeeks: [] })).toEqual([]);
  });

  it('notices sleep and mood, the most productive weekday, and reviews holding habits', () => {
    const entries = Array.from({ length: 20 }, (_, i) => {
      const day = addDays('2026-10-01', i);
      const rested = i % 2 === 0;
      return { day, mood: rested ? 4 : 3, energy: 3, sleepMinutes: rested ? 450 : 360, line: '', photoId: null };
    });
    // 30 tasks, mostly on Tuesdays.
    const completedDays = [...Array.from({ length: 20 }, (_, i) => addDays('2026-09-01', 7 * (i % 8))), ...Array.from({ length: 10 }, (_, i) => addDays('2026-09-03', i))];
    // Weeks with a review: Sep 7 and Sep 21 (habit done every day); others mostly missed.
    const logs = [] as HabitData['logs'][number][];
    for (const w of ['2026-09-07', '2026-09-21']) for (let i = 0; i < 7; i++) logs.push({ day: addDays(w, i), value: 1, status: 'done' });
    for (const w of ['2026-09-14', '2026-09-28']) logs.push({ day: w, value: 1, status: 'done' });
    const habits: HabitData[] = [{ id: 'h', title: 'H', input: { ...daily, startDay: '2026-09-07' }, logs }];

    const patterns = findPatterns({ today, entries, completedDays, habits, reviewedWeeks: ['2026-09-07', '2026-09-21'] });
    expect(patterns.map((p) => p.text)).toEqual([
      'Days after 7h+ sleep are rated 1.0 higher on mood.',
      expect.stringMatching(/^Tuesday is your most productive day/),
      expect.stringMatching(/^Habits hold at 100% in weeks with a review, \d+% without\.$/),
    ]);
  });
});
