import { addDays } from './days';
import { summarizeHabit, type HabitInput, type HabitLogInput } from './habits';

const today = '2026-10-26';
const daily: HabitInput = { kind: 'yesno', target: 1, schedule: { type: 'daily' }, startDay: '2026-01-01' };

/** Logs from a pattern read oldest → newest, ending yesterday: 1 done, 0 missed, s skipped. */
function history(pattern: string, end = addDays(today, -1)): HabitLogInput[] {
  const days = [...pattern];
  return days.flatMap((c, i): HabitLogInput[] => {
    const day = addDays(end, i - (days.length - 1));
    if (c === '1') return [{ day, value: 1, status: 'done' }];
    if (c === 's') return [{ day, value: 0, status: 'skipped' }];
    return [];
  });
}

const doneToday: HabitLogInput = { day: today, value: 1, status: 'done' };

describe('never miss twice', () => {
  it('counts done days back from today', () => {
    expect(summarizeHabit(daily, [...history('111'), doneToday], today).streak).toBe(4);
  });

  it('does not break the streak while today is still pending', () => {
    const s = summarizeHabit(daily, history('111'), today);
    expect(s.streak).toBe(3);
    expect(s.todayDone).toBe(false);
    expect(s.atRisk).toBe(false);
  });

  it('forgives one missed day', () => {
    const s = summarizeHabit(daily, [...history('11101'), doneToday], today);
    expect(s.streak).toBe(5);
    expect(s.graceUsed).toBe(1);
  });

  it('ends on two missed days in a row', () => {
    expect(summarizeHabit(daily, [...history('1110011'), doneToday], today).streak).toBe(3);
  });

  it('warns when yesterday was missed and today is not done', () => {
    const s = summarizeHabit(daily, history('1110'), today);
    expect(s.streak).toBe(3);
    expect(s.atRisk).toBe(true);
    // Missing today as well would make it two in a row.
    expect(summarizeHabit(daily, history('11100'), today).streak).toBe(0);
  });

  it('treats a skipped day as neutral', () => {
    const s = summarizeHabit(daily, [...history('11ss1'), doneToday], today);
    expect(s.streak).toBe(4);
    expect(s.graceUsed).toBe(0);
  });

  it('stops at the day the habit started', () => {
    const habit = { ...daily, startDay: addDays(today, -2) };
    const s = summarizeHabit(habit, history('11111'), today);
    expect(s.streak).toBe(2);
    expect(s.countedInWindow).toBe(2);
  });

  it('only counts scheduled weekdays', () => {
    // Mon/Wed/Fri. Today is Monday 26 Oct.
    const mwf: HabitInput = { ...daily, schedule: { type: 'weekdays', days: [1, 3, 5] } };
    const logs: HabitLogInput[] = ['2026-10-19', '2026-10-21', '2026-10-23'].map((day) => ({ day, value: 1, status: 'done' }));
    const s = summarizeHabit(mwf, logs, today);
    expect(s.streak).toBe(3);
    expect(s.last7.map((d) => d.state)).toEqual(['off', 'done', 'off', 'done', 'off', 'off', 'pending']);
  });
});

describe('count habits', () => {
  const water: HabitInput = { kind: 'count', target: 8, schedule: { type: 'daily' }, startDay: '2026-01-01' };

  it('is done once the value reaches the target', () => {
    expect(summarizeHabit(water, [{ day: today, value: 5, status: 'done' }], today).todayDone).toBe(false);
    expect(summarizeHabit(water, [{ day: today, value: 8, status: 'done' }], today).todayDone).toBe(true);
    expect(summarizeHabit(water, [{ day: today, value: 8, status: 'skipped' }], today).todayDone).toBe(false);
  });

  it('reports today’s value', () => {
    const s = summarizeHabit(water, [{ day: today, value: 9, status: 'done' }], today);
    expect(s.todayValue).toBe(9);
    expect(s.todayDone).toBe(true);
  });
});

describe('consistency', () => {
  it('is done ÷ (done + missed) over the window, skipping skipped days', () => {
    const s = summarizeHabit(daily, history('1111111s00'), today, 10);
    // 10-day window = today (pending) + the 9 most recent days of the pattern.
    expect(s.doneInWindow).toBe(6);
    expect(s.countedInWindow).toBe(8);
    expect(s.consistency).toBeCloseTo(0.75);
  });

  it('is null with nothing to count yet', () => {
    expect(summarizeHabit({ ...daily, startDay: today }, [], today).consistency).toBeNull();
  });

  it('scores "N times a week" by weekly totals', () => {
    const habit: HabitInput = { ...daily, schedule: { type: 'timesPerWeek', count: 3 } };
    // 7-day window = today (pending) + the 6 days before: three done.
    const s = summarizeHabit(habit, history('010101'), today, 7);
    expect(s.consistency).toBe(1);
    expect(s.last7.some((d) => d.state === 'missed')).toBe(false);
  });
});

it('returns the last 7 days ending today', () => {
  const s = summarizeHabit(daily, [...history('110111'), doneToday], today);
  expect(s.last7.map((d) => d.state)).toEqual(['done', 'done', 'missed', 'done', 'done', 'done', 'done']);
  expect(s.last7.at(-1)!.day).toBe(today);
});
