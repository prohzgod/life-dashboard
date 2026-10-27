import { addDays, startOfWeek, weekday, type Day } from './days';
import { dayState, type HabitInput, type HabitLogInput } from './habits';

export type DayEntryLike = { day: Day; mood: number | null; energy: number | null; sleepMinutes: number | null; line: string; photoId: string | null };
export type HabitData = { id: string; title: string; input: HabitInput; logs: readonly HabitLogInput[] };

export function weekDays(weekStart: Day): Day[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Which week to review: on Sunday, the week ending today; on other days, last week
 * until its review is done, then the current one (to review early).
 */
export function reviewWeekFor(today: Day, isDone: (weekStart: Day) => boolean): Day {
  const thisWeek = startOfWeek(today);
  if (weekday(today) === 0) return thisWeek;
  const lastWeek = addDays(thisWeek, -7);
  return isDone(lastWeek) ? thisWeek : lastWeek;
}

/** Done ÷ (done + missed) across habits for the days from–to. */
export function habitConsistencyBetween(habits: readonly HabitData[], from: Day, to: Day, today: Day): { done: number; counted: number } {
  let done = 0;
  let counted = 0;
  for (const habit of habits) {
    const byDay = new Map(habit.logs.map((l) => [l.day, l]));
    for (let day = from; day <= to && day <= today; day = addDays(day, 1)) {
      const state = dayState(habit.input, byDay.get(day), day, today);
      if (state === 'done') done++;
      if (state === 'done' || state === 'missed') counted++;
    }
  }
  return { done, counted };
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export type WeekSummary = {
  weekStart: Day;
  tasksDone: number;
  tasksDelta: number;
  habitConsistency: number | null;
  avgMood: number | null;
  avgSleepMinutes: number | null;
  journalDays: number;
  days: Array<{ day: Day; mood: number | null; energy: number | null }>;
  bestDay: DayEntryLike | null;
};

type WeekInput = {
  weekStart: Day;
  today: Day;
  /** Local days on which tasks were completed, one entry per task. */
  completedDays: readonly Day[];
  habits: readonly HabitData[];
  entries: readonly DayEntryLike[];
};

export function summarizeWeek({ weekStart, today, completedDays, habits, entries }: WeekInput): WeekSummary {
  const days = weekDays(weekStart);
  const end = days[6]!;
  const prevStart = addDays(weekStart, -7);
  const inWeek = completedDays.filter((d) => d >= weekStart && d <= end).length;
  const inPrev = completedDays.filter((d) => d >= prevStart && d < weekStart).length;
  const week = entries.filter((e) => e.day >= weekStart && e.day <= end);
  const habitTotals = habitConsistencyBetween(habits, weekStart, end, today);
  const scored = week.filter((e) => e.mood !== null);
  const bestDay =
    [...scored].sort(
      (a, b) => (b.mood ?? 0) - (a.mood ?? 0) || (b.energy ?? 0) - (a.energy ?? 0) || (b.sleepMinutes ?? 0) - (a.sleepMinutes ?? 0) || a.day.localeCompare(b.day),
    )[0] ?? null;

  return {
    weekStart,
    tasksDone: inWeek,
    tasksDelta: inWeek - inPrev,
    habitConsistency: habitTotals.counted ? habitTotals.done / habitTotals.counted : null,
    avgMood: average(scored.map((e) => e.mood!)),
    avgSleepMinutes: average(week.filter((e) => e.sleepMinutes !== null).map((e) => e.sleepMinutes!)),
    journalDays: week.filter((e) => e.line.trim() || e.photoId || e.mood !== null).length,
    days: days.map((day) => {
      const e = week.find((x) => x.day === day);
      return { day, mood: e?.mood ?? null, energy: e?.energy ?? null };
    }),
    bestDay,
  };
}

export type GoalMove = { id: string; title: string; before: number | null; after: number | null; delta: number; stalled: boolean };

/**
 * Goals by how much they moved this week. A goal that hasn't moved in two weeks and is
 * still under way counts as stalled, so the review can ask about it.
 */
export function goalsThatMoved(
  goals: ReadonlyArray<{ id: string; title: string; weekAgo: number | null; now: number | null; twoWeeksAgo: number | null; active: boolean }>,
): GoalMove[] {
  return goals
    .map((g) => ({
      id: g.id,
      title: g.title,
      before: g.weekAgo,
      after: g.now,
      delta: (g.now ?? 0) - (g.weekAgo ?? 0),
      stalled: g.active && g.now !== null && g.now < 100 && (g.now ?? 0) - (g.twoWeeksAgo ?? 0) <= 0,
    }))
    .filter((m) => m.after !== null && (m.delta > 0.05 || m.stalled))
    .sort((a, b) => Number(a.stalled) - Number(b.stalled) || b.delta - a.delta);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A short, kind summary of the week, written from its numbers (no AI involved). */
export function draftSummary(summary: WeekSummary, moves: readonly GoalMove[]): string {
  const parts: string[] = [];
  const tasks = summary.tasksDone;
  if (tasks) {
    const delta = summary.tasksDelta > 0 ? ` (${summary.tasksDelta} more than the week before)` : '';
    parts.push(`You finished ${tasks} ${tasks === 1 ? 'task' : 'tasks'}${delta}`);
  }
  if (summary.habitConsistency !== null) parts.push(`kept your habits at ${Math.round(summary.habitConsistency * 100)}%`);
  let text = parts.length ? `${parts.join(' and ')}.` : 'A quiet week on paper.';
  text = text.charAt(0).toUpperCase() + text.slice(1);

  if (summary.bestDay) text += ` ${WEEKDAYS[weekday(summary.bestDay.day)]} was your best day.`;
  const low = summary.days.filter((d) => d.mood !== null && d.mood <= 2);
  if (low.length) text += ` ${low.map((d) => WEEKDAYS[weekday(d.day)]).join(' and ')} ${low.length === 1 ? 'was' : 'were'} harder.`;

  const moved = moves.filter((m) => !m.stalled).slice(0, 2);
  if (moved.length) text += ` ${moved.map((m) => m.title).join(' and ')} moved forward.`;
  const stalled = moves.find((m) => m.stalled);
  if (stalled) text += ` ${stalled.title} hasn’t moved in two weeks: worth one protected block, or a conscious pause.`;
  return text;
}

/** About how many minutes are left in a review, from the step you're on (each takes a few). */
export function minutesLeft(step: number): number {
  const perStep = [3, 4, 5, 4, 1];
  return perStep.slice(step - 1).reduce((a, b) => a + b, 0);
}
