import type { HabitData } from './review';
import {
  draftPeriodSummary,
  nextPeriodName,
  periodEnd,
  periodName,
  periodStartOf,
  periodToReview,
  reviewState,
  shiftPeriod,
  summarizePeriod,
} from './periods';

describe('period dates', () => {
  it('finds the start and end of a month, quarter and year', () => {
    expect(periodStartOf('2026-10-29', 'month')).toBe('2026-10-01');
    expect(periodStartOf('2026-10-29', 'quarter')).toBe('2026-10-01');
    expect(periodStartOf('2026-08-15', 'quarter')).toBe('2026-07-01');
    expect(periodStartOf('2026-10-29', 'year')).toBe('2026-01-01');
    expect(periodEnd('2026-02-01', 'month')).toBe('2026-02-28');
    expect(periodEnd('2026-07-01', 'quarter')).toBe('2026-09-30');
    expect(periodEnd('2026-01-01', 'year')).toBe('2026-12-31');
  });

  it('steps across year ends', () => {
    expect(shiftPeriod('2026-12-01', 'month', 1)).toBe('2027-01-01');
    expect(shiftPeriod('2026-01-01', 'quarter', -1)).toBe('2025-10-01');
    expect(shiftPeriod('2026-01-01', 'year', 1)).toBe('2027-01-01');
  });

  it('names periods plainly', () => {
    expect(periodName('2026-10-01', 'month')).toBe('October 2026');
    expect(periodName('2026-10-01', 'quarter')).toBe('Q4 2026');
    expect(periodName('2026-01-01', 'year')).toBe('2026');
    expect(nextPeriodName('2026-12-01', 'month')).toBe('January 2027');
  });
});

describe('periodToReview', () => {
  const none = () => false;
  it('reviews the period that just ended until it is done', () => {
    expect(periodToReview('2026-11-03', 'month', none)).toBe('2026-10-01');
    expect(periodToReview('2026-11-03', 'month', (s) => s === '2026-10-01')).toBe('2026-11-01');
  });

  it('opens the current period in its final stretch, so you can review on the last days', () => {
    expect(periodToReview('2026-10-26', 'month', none)).toBe('2026-10-01');
    expect(periodToReview('2026-10-10', 'month', none)).toBe('2026-09-01');
    expect(periodToReview('2026-12-18', 'quarter', none)).toBe('2026-10-01');
    expect(periodToReview('2026-12-12', 'year', none)).toBe('2026-01-01');
    expect(periodToReview('2026-12-05', 'year', none)).toBe('2026-01-01');
  });

  it('leaves a period behind once it ended long ago', () => {
    expect(periodToReview('2027-02-10', 'year', none)).toBe('2026-01-01');
    expect(periodToReview('2026-10-29', 'year', none)).toBe('2026-01-01');
    expect(periodToReview('2026-10-29', 'quarter', none)).toBe('2026-07-01');
    expect(periodToReview('2026-11-20', 'month', none)).toBe('2026-11-01');
  });
});

describe('reviewState', () => {
  it('is ready once the period is over or in its final stretch, early before that', () => {
    expect(reviewState('2026-10-01', 'month', '2026-11-03', false)).toBe('ready');
    expect(reviewState('2026-10-01', 'month', '2026-10-27', false)).toBe('ready');
    expect(reviewState('2026-10-01', 'month', '2026-10-10', false)).toBe('early');
    expect(reviewState('2026-10-01', 'month', '2026-10-10', true)).toBe('done');
  });
});

describe('summarizePeriod', () => {
  const habit: HabitData = {
    id: 'h',
    title: 'Walk',
    input: { kind: 'yesno', target: 1, schedule: { type: 'daily' }, startDay: '2026-09-01' },
    logs: [
      { day: '2026-10-01', value: 1, status: 'done' },
      { day: '2026-10-02', value: 1, status: 'done' },
    ],
  };
  const entry = (day: string, mood: number | null, energy: number | null = null) => ({ day, mood, energy, sleepMinutes: 420, line: '', photoId: null });

  it('counts the month, compares with the month before, and buckets mood by day', () => {
    const s = summarizePeriod({
      period: 'month',
      start: '2026-10-01',
      today: '2026-10-04',
      completedDays: ['2026-10-02', '2026-10-03', '2026-09-20'],
      habits: [habit],
      entries: [entry('2026-10-01', 4, 3), entry('2026-10-03', 2)],
    });
    expect(s).toMatchObject({ tasksDone: 2, tasksDelta: 1, avgMood: 3, avgSleepMinutes: 420, checkInDays: 2, daysSoFar: 4 });
    // Today is still to come, so it doesn't count: 2 done of 3.
    expect(s.habitConsistency).toBeCloseTo(2 / 3);
    expect(s.buckets).toHaveLength(31);
    expect(s.buckets[0]).toMatchObject({ label: '1', mood: 4, energy: 3 });
    expect(s.bestDay?.day).toBe('2026-10-01');
  });

  it('buckets a year by month with average mood', () => {
    const s = summarizePeriod({ period: 'year', start: '2026-01-01', today: '2026-12-31', completedDays: [], habits: [], entries: [entry('2026-03-01', 4), entry('2026-03-02', 2)] });
    expect(s.buckets.map((b) => b.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    expect(s.buckets[2]?.mood).toBe(3);
    expect(s.buckets[0]?.mood).toBeNull();
  });

  it('buckets a quarter by its three months', () => {
    const s = summarizePeriod({ period: 'quarter', start: '2026-10-01', today: '2026-12-31', completedDays: [], habits: [], entries: [] });
    expect(s.buckets.map((b) => b.label)).toEqual(['Oct', 'Nov', 'Dec']);
  });
});

describe('draftPeriodSummary', () => {
  it('writes a short summary from the numbers', () => {
    const s = summarizePeriod({ period: 'month', start: '2026-10-01', today: '2026-10-31', completedDays: ['2026-10-02', '2026-10-03'], habits: [], entries: [entry('2026-10-05', 5)] });
    const text = draftPeriodSummary(s, [{ id: 'g', title: 'Run a half-marathon', before: 10, after: 40, delta: 30, stalled: false }], 'October');
    expect(text).toBe('In October you finished 2 tasks and checked in on 1 day. Your best day was Mon 5 Oct. Run a half-marathon moved forward.');
  });

  it('is kind about a quiet period', () => {
    const s = summarizePeriod({ period: 'quarter', start: '2026-10-01', today: '2026-12-31', completedDays: [], habits: [], entries: [] });
    expect(draftPeriodSummary(s, [], 'Q4 2026')).toBe('Q4 2026 was quiet on paper.');
  });

  function entry(day: string, mood: number) {
    return { day, mood, energy: null, sleepMinutes: null, line: '', photoId: null };
  }
});
