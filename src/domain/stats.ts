import { sleepMoodPattern } from './health';
import { addDays, dayOfMonth, daysInMonth, diffDays, isoWeek, makeDay, month, startOfWeek, weekday, year, type Day } from './days';
import { dayState } from './habits';
import { habitConsistencyBetween, type DayEntryLike, type HabitData } from './review';

export type Period = 'day' | 'week' | 'month' | 'year';

export function periodRange(period: Period, anchor: Day): { from: Day; to: Day } {
  switch (period) {
    case 'day':
      return { from: anchor, to: anchor };
    case 'week': {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 6) };
    }
    case 'month':
      return { from: makeDay(year(anchor), month(anchor), 1), to: makeDay(year(anchor), month(anchor), daysInMonth(year(anchor), month(anchor))) };
    case 'year':
      return { from: makeDay(year(anchor), 1, 1), to: makeDay(year(anchor), 12, 31) };
  }
}

/** The same kind of period, `n` steps away. */
export function shiftPeriod(period: Period, anchor: Day, n: number): Day {
  switch (period) {
    case 'day':
      return addDays(anchor, n);
    case 'week':
      return addDays(anchor, 7 * n);
    case 'month': {
      const m = month(anchor) - 1 + n;
      const y = year(anchor) + Math.floor(m / 12);
      const mm = ((m % 12) + 12) % 12 + 1;
      return makeDay(y, mm, Math.min(dayOfMonth(anchor), daysInMonth(y, mm)));
    }
    case 'year':
      return makeDay(year(anchor) + n, month(anchor), Math.min(dayOfMonth(anchor), daysInMonth(year(anchor) + n, month(anchor))));
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function periodLabel(period: Period, anchor: Day): string {
  const { from, to } = periodRange(period, anchor);
  switch (period) {
    case 'day':
      return `${WEEKDAYS[weekday(anchor)]!.slice(0, 3)} ${dayOfMonth(anchor)} ${SHORT_MONTHS[month(anchor) - 1]}`;
    case 'week':
      return `Week ${isoWeek(from)} · ${dayOfMonth(from)} ${SHORT_MONTHS[month(from) - 1]} – ${dayOfMonth(to)} ${SHORT_MONTHS[month(to) - 1]}`;
    case 'month':
      return `${MONTHS[month(anchor) - 1]} ${year(anchor)}`;
    case 'year':
      return String(year(anchor));
  }
}

/** Twelve rows of up to 31 days, each with the day's mood (or null). Days that don't exist are null cells. */
export function yearPixels(y: number, entries: readonly DayEntryLike[]): Array<Array<{ day: Day; mood: number | null } | null>> {
  const moods = new Map(entries.filter((e) => year(e.day) === y).map((e) => [e.day, e.mood]));
  return Array.from({ length: 12 }, (_, m) =>
    Array.from({ length: 31 }, (_, d) => {
      if (d + 1 > daysInMonth(y, m + 1)) return null;
      const day = makeDay(y, m + 1, d + 1);
      return { day, mood: moods.get(day) ?? null };
    }),
  );
}

export type HeatCell = { day: Day; level: 0 | 1 | 2 | 3 | 4; done: number; scheduled: number } | null;

/**
 * Habits combined, one column per week (Monday first) for the days from–to.
 * Level 0–4 is the share of scheduled habits done; future days and days before any habit are null.
 */
export function habitHeatmap(habits: readonly HabitData[], from: Day, to: Day, today: Day): HeatCell[][] {
  const start = startOfWeek(from);
  const weeks = Math.ceil((diffDays(start, to) + 1) / 7);
  const byHabit = habits.map((h) => ({ h, logs: new Map(h.logs.map((l) => [l.day, l])) }));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(start, w * 7 + d);
      if (day < from || day > to || day > today) return null;
      let done = 0;
      let scheduled = 0;
      for (const { h, logs } of byHabit) {
        const state = dayState(h.input, logs.get(day), day, today);
        if (state === 'done') done++;
        if (state === 'done' || state === 'missed' || state === 'pending') scheduled++;
      }
      if (!scheduled) return null;
      const share = done / scheduled;
      const level = (share === 0 ? 0 : share < 0.34 ? 1 : share < 0.67 ? 2 : share < 1 ? 3 : 4) as 0 | 1 | 2 | 3 | 4;
      return { day, level, done, scheduled };
    }),
  );
}

export type PeriodStats = {
  tasksDone: number;
  tasksPerDay: number;
  habitConsistency: number | null;
  bestHabit: { title: string; consistency: number } | null;
  avgMood: number | null;
  bestMonth: string | null;
  avgSleepMinutes: number | null;
  nightsOver7h: number | null;
  reviewsDone: number;
  reviewWeeks: number;
};

type StatsInput = {
  from: Day;
  to: Day;
  today: Day;
  completedDays: readonly Day[];
  habits: readonly HabitData[];
  entries: readonly DayEntryLike[];
  /** Monday of each week with a completed review. */
  reviewedWeeks: readonly Day[];
  /** When you started using the app: weeks before it aren't counted as unreviewed. */
  since?: Day;
};

export function periodStats({ from, to, today, completedDays, habits, entries, reviewedWeeks, since }: StatsInput): PeriodStats {
  const end = to < today ? to : today;
  const days = Math.max(1, diffDays(from, end) + 1);
  const tasksDone = completedDays.filter((d) => d >= from && d <= to).length;
  const all = habitConsistencyBetween(habits, from, to, today);
  const perHabit = habits
    .map((h) => ({ h, totals: habitConsistencyBetween([h], from, to, today) }))
    .filter((x) => x.totals.counted > 0)
    .map((x) => ({ title: x.h.title, consistency: x.totals.done / x.totals.counted }))
    .sort((a, b) => b.consistency - a.consistency);

  const inRange = entries.filter((e) => e.day >= from && e.day <= to);
  const moods = inRange.filter((e) => e.mood !== null);
  const sleeps = inRange.filter((e) => e.sleepMinutes !== null);
  const monthMoods = new Map<number, number[]>();
  for (const e of moods) monthMoods.set(month(e.day), [...(monthMoods.get(month(e.day)) ?? []), e.mood!]);
  const best = [...monthMoods].map(([m, v]) => ({ m, avg: v.reduce((a, b) => a + b, 0) / v.length })).sort((a, b) => b.avg - a.avg)[0];

  // Weeks that have ended (or end today), counted from when you started.
  const weeksInRange: Day[] = [];
  const first = startOfWeek(since && since > from ? since : from);
  for (let w = first; w <= end; w = addDays(w, 7)) if (addDays(w, 6) <= today) weeksInRange.push(w);

  return {
    tasksDone,
    tasksPerDay: tasksDone / days,
    habitConsistency: all.counted ? all.done / all.counted : null,
    bestHabit: perHabit[0] ?? null,
    avgMood: moods.length ? moods.reduce((a, e) => a + e.mood!, 0) / moods.length : null,
    bestMonth: best && monthMoods.size > 1 ? MONTHS[best.m - 1]! : null,
    avgSleepMinutes: sleeps.length ? sleeps.reduce((a, e) => a + e.sleepMinutes!, 0) / sleeps.length : null,
    nightsOver7h: sleeps.length ? sleeps.filter((e) => e.sleepMinutes! >= 420).length / sleeps.length : null,
    reviewsDone: reviewedWeeks.filter((w) => w >= startOfWeek(from) && w <= to).length,
    reviewWeeks: weeksInRange.length,
  };
}

export type Pattern = { text: string; detail: string; link: { label: string; to: string } | null };

/** Plain observations from your own data, only once there's enough of it to mean something. */
export function findPatterns({ entries, completedDays, habits, reviewedWeeks, today }: Omit<StatsInput, 'from' | 'to' | 'since'>): Pattern[] {
  const out: Pattern[] = [];

  const sleep = sleepMoodPattern(entries);
  if (sleep && Math.abs(sleep.diff) >= 0.3) {
    out.push({
      text: `Days after 7h+ sleep are rated ${Math.abs(sleep.diff).toFixed(1)} ${sleep.diff > 0 ? 'higher' : 'lower'} on mood.`,
      detail: `${sleep.restedDays} rested days vs ${sleep.shortDays} short nights`,
      link: { label: 'See sleep data', to: '/health' },
    });
  }

  if (completedDays.length >= 20) {
    const byWeekday = Array.from({ length: 7 }, () => 0);
    for (const d of completedDays) byWeekday[weekday(d)]!++;
    const first = completedDays.reduce((a, b) => (a < b ? a : b));
    const weeks = Math.max(1, Math.ceil((diffDays(first, today) + 1) / 7));
    const best = byWeekday.indexOf(Math.max(...byWeekday));
    const perDay = byWeekday[best]! / weeks;
    out.push({
      text: `${WEEKDAYS[best]} is your most productive day, about ${Math.round(perDay)} ${Math.round(perDay) === 1 ? 'task' : 'tasks'} done.`,
      detail: `${completedDays.length} tasks over ${weeks} weeks`,
      link: { label: `Plan deep work on ${WEEKDAYS[best]}s`, to: '/tasks?view=upcoming' },
    });
  }

  if (habits.length) {
    const reviewed = new Set(reviewedWeeks);
    const withReview: number[] = [];
    const without: number[] = [];
    const firstStart = habits.map((h) => h.input.startDay).reduce((a, b) => (a < b ? a : b));
    for (let w = startOfWeek(firstStart); addDays(w, 6) < today; w = addDays(w, 7)) {
      const t = habitConsistencyBetween(habits, w, addDays(w, 6), today);
      if (!t.counted) continue;
      (reviewed.has(w) ? withReview : without).push(t.done / t.counted);
    }
    if (withReview.length >= 2 && without.length >= 2) {
      const a = Math.round(avg(withReview) * 100);
      const b = Math.round(avg(without) * 100);
      if (Math.abs(a - b) >= 5) {
        out.push({
          text: `Habits hold at ${a}% in weeks with a review, ${b}% without.`,
          detail: `${withReview.length} reviewed weeks vs ${without.length} without`,
          link: { label: 'Open weekly review', to: '/review' },
        });
      }
    }
  }
  return out;
}

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
