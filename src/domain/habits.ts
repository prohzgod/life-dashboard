import { addDays, type Day, weekday } from './days';

export type HabitSchedule = { type: 'daily' } | { type: 'weekdays'; days: number[] } | { type: 'timesPerWeek'; count: number };

export type HabitInput = {
  kind: 'yesno' | 'count' | 'duration' | 'negative';
  /** Daily target: 1 for yes/no and negative habits, otherwise a count or minutes. */
  target: number;
  schedule: HabitSchedule;
  /** The first day the habit existed; earlier days don't count against it. */
  startDay: Day;
};

export type HabitLogInput = { day: Day; value: number; status: 'done' | 'skipped' | 'missed' };

/** done, skipped (on purpose, neutral), missed, pending (today, not yet), off (not scheduled), before (didn't exist) */
export type HabitDayState = 'done' | 'skipped' | 'missed' | 'pending' | 'off' | 'before';

export type HabitSummary = {
  todayValue: number;
  todayDone: boolean;
  /** Done days in the current run. Never miss twice: one missed day keeps it, two in a row end it. */
  streak: number;
  /** Single missed days forgiven inside the current streak. */
  graceUsed: number;
  /** Yesterday was missed: missing today too would end the streak. */
  atRisk: boolean;
  /** Done ÷ (done + missed) over the window, 0–1, or null before there's anything to count. */
  consistency: number | null;
  doneInWindow: number;
  countedInWindow: number;
  /** Oldest first, ending today. */
  last7: Array<{ day: Day; state: HabitDayState }>;
};

export const CONSISTENCY_WINDOW_DAYS = 30;

/** Count and duration habits are done when the value reaches the target; yes/no ones when logged done. */
export function isLogDone(habit: Pick<HabitInput, 'kind' | 'target'>, log: HabitLogInput | undefined): boolean {
  if (!log || log.status !== 'done') return false;
  return habit.kind === 'count' || habit.kind === 'duration' ? log.value >= habit.target : true;
}

function isScheduled(schedule: HabitSchedule, day: Day): boolean {
  return schedule.type !== 'weekdays' || schedule.days.includes(weekday(day));
}

export function dayState(habit: HabitInput, log: HabitLogInput | undefined, day: Day, today: Day): HabitDayState {
  if (day < habit.startDay) return 'before';
  if (!isScheduled(habit.schedule, day)) return 'off';
  if (log?.status === 'skipped') return 'skipped';
  if (isLogDone(habit, log)) return 'done';
  if (day === today) return 'pending';
  // "N times a week" leaves the days flexible, so a day without it isn't a miss.
  if (habit.schedule.type === 'timesPerWeek') return 'off';
  return 'missed';
}

export function summarizeHabit(habit: HabitInput, logs: readonly HabitLogInput[], today: Day, windowDays = CONSISTENCY_WINDOW_DAYS): HabitSummary {
  const byDay = new Map(logs.map((log) => [log.day, log]));
  const state = (day: Day) => dayState(habit, byDay.get(day), day, today);
  const todayLog = byDay.get(today);

  // Streak: walk back from today.
  let streak = 0;
  let graceUsed = 0;
  let missesInARow = 0;
  for (let i = 0; ; i++) {
    const day = addDays(today, -i);
    const s = state(day);
    if (s === 'before') break;
    if (s === 'done') {
      if (missesInARow === 1) graceUsed++;
      missesInARow = 0;
      streak++;
    } else if (s === 'missed') {
      missesInARow++;
      if (missesInARow >= 2) break;
    }
    if (i > 3660) break; // ten years is plenty
  }
  const yesterday = state(addDays(today, -1));

  // Consistency over the window, today included only once it's done.
  let done = 0;
  let missed = 0;
  for (let i = 0; i < windowDays; i++) {
    const s = state(addDays(today, -i));
    if (s === 'done') done++;
    else if (s === 'missed') missed++;
  }
  let consistency: number | null = done + missed ? done / (done + missed) : null;
  if (habit.schedule.type === 'timesPerWeek') {
    const weeks = windowDays / 7;
    consistency = done ? Math.min(1, done / (habit.schedule.count * weeks)) : null;
  }

  return {
    todayValue: todayLog?.value ?? 0,
    todayDone: isLogDone(habit, todayLog),
    streak,
    graceUsed,
    atRisk: yesterday === 'missed' && !isLogDone(habit, todayLog) && streak > 0,
    consistency,
    doneInWindow: done,
    countedInWindow: done + missed,
    last7: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i - 6);
      return { day, state: state(day) };
    }),
  };
}
