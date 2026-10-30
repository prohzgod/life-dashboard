import { messages } from '@/i18n/locale';
import { addDays, dayOfMonth, dayToDate, daysInMonth, diffDays, makeDay, month, year, type Day } from './days';
import { habitConsistencyBetween, type DayEntryLike, type GoalMove, type HabitData } from './review';

/** The longer reviews. The weekly one lives in review.ts. */
export type ReviewPeriod = 'month' | 'quarter' | 'year';

const MONTHS_IN: Record<ReviewPeriod, number> = { month: 1, quarter: 3, year: 12 };
/** How many days before a period ends its review opens early. */
const FINAL_STRETCH: Record<ReviewPeriod, number> = { month: 6, quarter: 13, year: 20 };
/** How long after a period ends its review is still offered; later, it's left behind. */
const GRACE: Record<ReviewPeriod, number> = { month: 14, quarter: 31, year: 60 };

export function periodStartOf(day: Day, period: ReviewPeriod): Day {
  const m = month(day);
  if (period === 'month') return makeDay(year(day), m, 1);
  if (period === 'quarter') return makeDay(year(day), m - ((m - 1) % 3), 1);
  return makeDay(year(day), 1, 1);
}

export function shiftPeriod(start: Day, period: ReviewPeriod, n: number): Day {
  return makeDay(year(start), month(start) + n * MONTHS_IN[period], 1);
}

/** The last day of the period. */
export function periodEnd(start: Day, period: ReviewPeriod): Day {
  return addDays(shiftPeriod(start, period, 1), -1);
}

/** "October 2026", "Q4 2026", "2026". */
export function periodName(start: Day, period: ReviewPeriod): string {
  if (period === 'month') return messages().format.monthYear(dayToDate(start));
  if (period === 'quarter') return messages().reviews.quarter(Math.floor((month(start) - 1) / 3) + 1, year(start));
  return String(year(start));
}

export function nextPeriodName(start: Day, period: ReviewPeriod): string {
  return periodName(shiftPeriod(start, period, 1), period);
}

/**
 * Which period to review: the current one in its final stretch (the last week of a month, two
 * weeks of a quarter, three of a year), otherwise the one that just ended until it's done, for a
 * while (two weeks, a month, two months). After that, the current one, to review early.
 */
export function periodToReview(today: Day, period: ReviewPeriod, isDone: (start: Day) => boolean): Day {
  const current = periodStartOf(today, period);
  if (diffDays(today, periodEnd(current, period)) <= FINAL_STRETCH[period]) return current;
  const previous = shiftPeriod(current, period, -1);
  if (diffDays(current, today) >= GRACE[period]) return current;
  return isDone(previous) ? current : previous;
}

/** done, ready (over, or in its final stretch) or early (you can still review it now). */
export function reviewState(start: Day, period: ReviewPeriod, today: Day, done: boolean): 'done' | 'ready' | 'early' {
  if (done) return 'done';
  return diffDays(today, periodEnd(start, period)) <= FINAL_STRETCH[period] ? 'ready' : 'early';
}

export type PeriodBucket = { label: string; start: Day; mood: number | null; energy: number | null };

export type PeriodSummary = {
  period: ReviewPeriod;
  start: Day;
  end: Day;
  tasksDone: number;
  /** Against the period before. */
  tasksDelta: number;
  habitConsistency: number | null;
  avgMood: number | null;
  avgSleepMinutes: number | null;
  checkInDays: number;
  /** Days of the period up to today. */
  daysSoFar: number;
  /** Days for a month, months for a quarter or year. */
  buckets: PeriodBucket[];
  bestDay: DayEntryLike | null;
};

type PeriodInput = {
  period: ReviewPeriod;
  start: Day;
  today: Day;
  /** Local days on which tasks were completed, one entry per task. */
  completedDays: readonly Day[];
  habits: readonly HabitData[];
  entries: readonly DayEntryLike[];
};

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function summarizePeriod({ period, start, today, completedDays, habits, entries }: PeriodInput): PeriodSummary {
  const end = periodEnd(start, period);
  const prevStart = shiftPeriod(start, period, -1);
  const inPeriod = entries.filter((e) => e.day >= start && e.day <= end);
  const scored = inPeriod.filter((e) => e.mood !== null);
  const habitTotals = habitConsistencyBetween(habits, start, end, today);
  const tasksDone = completedDays.filter((d) => d >= start && d <= end).length;
  const tasksBefore = completedDays.filter((d) => d >= prevStart && d < start).length;
  const lastSeen = today < end ? today : end;

  const bucketOf = (from: Day, to: Day, label: string): PeriodBucket => {
    const span = inPeriod.filter((e) => e.day >= from && e.day <= to);
    return {
      label,
      start: from,
      mood: average(span.filter((e) => e.mood !== null).map((e) => e.mood!)),
      energy: average(span.filter((e) => e.energy !== null).map((e) => e.energy!)),
    };
  };
  const buckets =
    period === 'month'
      ? Array.from({ length: daysInMonth(year(start), month(start)) }, (_, i) => {
          const day = addDays(start, i);
          return bucketOf(day, day, String(dayOfMonth(day)));
        })
      : Array.from({ length: MONTHS_IN[period] }, (_, i) => {
          const from = shiftPeriod(start, 'month', i);
          return bucketOf(from, periodEnd(from, 'month'), messages().format.monthsShort[month(from) - 1]!);
        });

  const bestDay =
    [...scored].sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0) || (b.energy ?? 0) - (a.energy ?? 0) || (b.sleepMinutes ?? 0) - (a.sleepMinutes ?? 0) || a.day.localeCompare(b.day))[0] ?? null;

  return {
    period,
    start,
    end,
    tasksDone,
    tasksDelta: tasksDone - tasksBefore,
    habitConsistency: habitTotals.counted ? habitTotals.done / habitTotals.counted : null,
    avgMood: average(scored.map((e) => e.mood!)),
    avgSleepMinutes: average(inPeriod.filter((e) => e.sleepMinutes !== null).map((e) => e.sleepMinutes!)),
    checkInDays: inPeriod.filter((e) => e.mood !== null || e.energy !== null).length,
    daysSoFar: Math.max(0, diffDays(start, lastSeen) + 1),
    buckets,
    bestDay,
  };
}

function shortDay(day: Day): string {
  return messages().format.dayShort(dayToDate(day));
}

/** A short, kind summary of the period, written from its numbers (no AI involved). */
export function draftPeriodSummary(summary: PeriodSummary, moves: readonly GoalMove[], name: string): string {
  const { format, reviews } = messages();
  const t = reviews.summary;
  const parts: string[] = [];
  if (summary.tasksDone) parts.push(t.finishedTasks(summary.tasksDone));
  if (summary.habitConsistency !== null) parts.push(t.habits(Math.round(summary.habitConsistency * 100)));
  if (summary.checkInDays) parts.push(t.checkedIn(summary.checkInDays));
  if (!parts.length && !moves.length) return t.quietPeriod(name);

  let text = parts.length ? t.inPeriod(name, format.list(parts)) : '';
  if (summary.bestDay) text += ` ${t.bestDayWas(shortDay(summary.bestDay.day))}`;
  const moved = moves.filter((m) => !m.stalled).slice(0, 2);
  if (moved.length) text += ` ${t.moved(moved.map((m) => m.title).join(t.and))}`;
  const stalled = moves.find((m) => m.stalled);
  if (stalled) text += ` ${t.stalledPeriod(stalled.title)}`;
  return text.trim();
}

/** About how many minutes are left, from the step you're on. */
export function periodMinutesLeft(period: ReviewPeriod, step: number): number {
  const perStep = period === 'month' ? [5, 7, 5, 1] : period === 'quarter' ? [7, 12, 8, 1] : [10, 20, 12, 2];
  return perStep.slice(step - 1).reduce((a, b) => a + b, 0);
}
