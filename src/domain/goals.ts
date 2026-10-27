import { addDays, dayToDate, daysInMonth, diffDays, makeDay, month, startOfWeek, year, type Day } from './days';
import { expectedPercent, paceStatus, PACE_TOLERANCE } from './pace';
import { metricProgress } from './progress';

export type ProgressMethod =
  | 'taskCount'
  | 'weightedTasks'
  | 'metric'
  | 'keyResultAverage'
  | 'milestones'
  | 'habitConsistency'
  | 'manual'
  | 'childRollup';

export type GoalLike = {
  id: string;
  parentGoalId: string | null;
  title: string;
  progressMethod: ProgressMethod;
  startValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  startDate: Day;
  endDate: Day;
  status: 'active' | 'paused' | 'done' | 'dropped';
  commitment: 'committed' | 'aspirational';
  /** Value updates over time (metric and manual goals), oldest first. */
  progressLog: ReadonlyArray<{ at: string; value: number }>;
};

export type ProgressContext = {
  goals: readonly GoalLike[];
  tasks: ReadonlyArray<{ goalId: string | null; status: string; estimateMin: number | null; completedAt: string | null; parentTaskId: string | null }>;
  milestones: ReadonlyArray<{ goalId: string; doneAt: string | null }>;
  keyResults: ReadonlyArray<{ goalId: string; start: number; target: number; current: number; weight: number }>;
  /** Consistency (0–1) of each habit, by the goal it serves. */
  habitConsistency: ReadonlyMap<string, readonly number[]>;
};

export type GoalProgress = {
  /** 0–100, or null when there's nothing to measure yet. */
  percent: number | null;
  /** For counted methods, e.g. 2 of 3 milestones. */
  done?: number;
  total?: number;
  /** OKR score, 0–1. */
  score?: number;
};

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** The goal's value at a moment, from its log (the start value before any update). */
export function valueAt(goal: GoalLike, at: string | null): number | null {
  if (!at) return goal.currentValue;
  let value = goal.startValue;
  for (const entry of goal.progressLog) if (entry.at <= at) value = entry.value;
  return value;
}

/**
 * Progress by the goal's method (PRODUCT.md "Pace rules"). With `at`, progress as it stood then,
 * from completion dates and the value log (key results and habits only know their present).
 */
export function goalProgress(goal: GoalLike, ctx: ProgressContext, at: string | null = null, seen = new Set<string>()): GoalProgress {
  const doneBy = (stamp: string | null) => !!stamp && (!at || stamp <= at);
  switch (goal.progressMethod) {
    case 'metric':
      return { percent: metricProgress({ ...goal, currentValue: valueAt(goal, at) }) };
    case 'manual': {
      const value = valueAt(goal, at);
      const target = goal.targetValue ?? 100;
      return { percent: value === null || !target ? null : clamp((value / target) * 100) };
    }
    case 'taskCount':
    case 'weightedTasks': {
      const tasks = ctx.tasks.filter((t) => t.goalId === goal.id && !t.parentTaskId);
      if (!tasks.length) return { percent: null, done: 0, total: 0 };
      const weight = (t: (typeof tasks)[number]) => (goal.progressMethod === 'weightedTasks' ? (t.estimateMin ?? 30) : 1);
      const done = tasks.filter((t) => t.status === 'done' && doneBy(t.completedAt));
      const total = tasks.reduce((sum, t) => sum + weight(t), 0);
      return { percent: clamp((done.reduce((sum, t) => sum + weight(t), 0) / total) * 100), done: done.length, total: tasks.length };
    }
    case 'milestones': {
      const milestones = ctx.milestones.filter((m) => m.goalId === goal.id);
      if (!milestones.length) return { percent: null, done: 0, total: 0 };
      const done = milestones.filter((m) => doneBy(m.doneAt)).length;
      return { percent: (done / milestones.length) * 100, done, total: milestones.length };
    }
    case 'keyResultAverage': {
      const krs = ctx.keyResults.filter((k) => k.goalId === goal.id);
      if (!krs.length) return { percent: null, done: 0, total: 0 };
      const weightSum = krs.reduce((sum, k) => sum + (k.weight || 1), 0);
      const score =
        krs.reduce((sum, k) => {
          const span = k.target - k.start;
          const p = span ? Math.min(1, Math.max(0, (k.current - k.start) / span)) : k.current >= k.target ? 1 : 0;
          return sum + p * (k.weight || 1);
        }, 0) / weightSum;
      return { percent: score * 100, score, total: krs.length };
    }
    case 'habitConsistency': {
      const values = ctx.habitConsistency.get(goal.id) ?? [];
      if (!values.length) return { percent: null };
      return { percent: (values.reduce((a, b) => a + b, 0) / values.length) * 100 };
    }
    case 'childRollup': {
      if (seen.has(goal.id)) return { percent: null };
      seen.add(goal.id);
      const children = ctx.goals.filter((g) => g.parentGoalId === goal.id && g.status !== 'dropped');
      const values = children.map((c) => goalProgress(c, ctx, at, seen).percent).filter((p): p is number => p !== null);
      if (!values.length) return { percent: null, done: 0, total: children.length };
      return { percent: values.reduce((a, b) => a + b, 0) / values.length, done: children.filter((c) => c.status === 'done').length, total: children.length };
    }
  }
}

/** Stretch goals: 0.6–0.7 of the target counts as a win, so the pace line runs at 70%. */
export const STRETCH_WIN = 0.7;

export type GoalPace =
  | { state: 'done' | 'dropped' | 'paused' | 'no-data'; expected: number | null; sentence: string }
  | { state: 'upcoming'; expected: 0; sentence: string }
  | { state: 'ended'; expected: 100; sentence: string }
  | { state: 'on-pace' | 'behind'; expected: number; sentence: string; behindDays: number };

const CURRENCIES = ['$', '€', '£', '¥', '₫'];

export function formatAmount(value: number, unit: string | null): string {
  const n = Math.abs(value) >= 100 ? Math.round(value).toLocaleString('en-US') : String(Math.round(value * 10) / 10);
  if (unit && CURRENCIES.includes(unit)) return `${unit}${n}`;
  return unit ? `${n} ${unit}` : n;
}

/** Where the goal should be today, and a plain sentence about it. */
export function goalPace(goal: GoalLike, percent: number | null, today: Day): GoalPace {
  if (goal.status === 'done') return { state: 'done', expected: null, sentence: 'Done' };
  if (goal.status === 'dropped') return { state: 'dropped', expected: null, sentence: 'Dropped' };
  if (goal.status === 'paused') return { state: 'paused', expected: null, sentence: 'Paused' };
  if (today < goal.startDate) {
    const days = diffDays(today, goal.startDate);
    return { state: 'upcoming', expected: 0, sentence: days === 1 ? 'Starts tomorrow' : days < 7 ? `Starts ${weekdayName(goal.startDate)}` : `Starts ${shortDate(goal.startDate)}` };
  }
  if (percent === null) return { state: 'no-data', expected: null, sentence: 'Nothing to measure yet' };
  if (today > goal.endDate) return { state: 'ended', expected: 100, sentence: percent >= 100 ? 'Reached' : `Ended ${shortDate(goal.endDate)}` };

  const raw = expectedPercent(dayToDate(goal.startDate), addDayDate(goal.endDate), dayToDate(today));
  const expected = goal.commitment === 'aspirational' ? raw * STRETCH_WIN : raw;
  const totalDays = diffDays(goal.startDate, goal.endDate) + 1;
  if (paceStatus(percent, expected) === 'on-pace') return { state: 'on-pace', expected, sentence: 'On pace', behindDays: 0 };

  const behindDays = Math.max(1, Math.round(((expected - percent) / 100) * totalDays));
  const span = goal.startValue !== null && goal.targetValue !== null ? goal.targetValue - goal.startValue : null;
  let sentence: string;
  if (goal.progressMethod === 'metric' && span && goal.unit && CURRENCIES.includes(goal.unit)) {
    sentence = `${formatAmount(((expected - percent) / 100) * Math.abs(span), goal.unit)} behind pace`;
  } else if (behindDays >= 14) {
    sentence = `Behind by about ${Math.round(behindDays / 7)} weeks`;
  } else if (behindDays >= 2) {
    sentence = `Behind by about ${behindDays} days`;
  } else {
    sentence = 'A little behind';
  }
  return { state: 'behind', expected, sentence, behindDays };
}

/** A kind, concrete way back to pace, or null when on pace. */
export function catchUp(goal: GoalLike, progress: GoalProgress, pace: GoalPace, today: Day): { text: string; taskTitle: string } | null {
  if (pace.state !== 'behind') return null;
  const weeksLeft = Math.max(1, Math.ceil((diffDays(today, goal.endDate) + 1) / 7));
  if (goal.progressMethod === 'metric' && goal.targetValue !== null && goal.currentValue !== null) {
    const perWeek = (goal.targetValue - goal.currentValue) / weeksLeft;
    if (perWeek > 0) {
      const amount = formatAmount(perWeek, goal.unit);
      return {
        text: `Catch up: about ${amount} a week for the next ${weeksLeft === 1 ? 'week' : `${weeksLeft} weeks`} gets you there by ${shortDate(goal.endDate)}.`,
        taskTitle: `${goal.title}: ${amount} this week`,
      };
    }
  }
  if ((goal.progressMethod === 'taskCount' || goal.progressMethod === 'weightedTasks') && progress.total !== undefined && progress.done !== undefined) {
    const perWeek = Math.ceil((progress.total - progress.done) / weeksLeft);
    return { text: `Catch up: finish about ${perWeek} linked ${perWeek === 1 ? 'task' : 'tasks'} a week until ${shortDate(goal.endDate)}.`, taskTitle: `${goal.title}: next step` };
  }
  if (goal.progressMethod === 'milestones') {
    return { text: 'Catch up: block an hour this week for the next milestone.', taskTitle: `${goal.title}: work on the next milestone` };
  }
  return { text: 'Catch up: plan one small step for this goal this week.', taskTitle: `${goal.title}: one small step` };
}

/** The tolerance in points, re-exported for screens that explain the tick. */
export { PACE_TOLERANCE };

function addDayDate(day: Day): Date {
  // The goal's last day counts in full, so pace runs to the end of it.
  return dayToDate(addDays(day, 1));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function shortDate(day: Day): string {
  const d = dayToDate(day);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function weekdayName(day: Day): string {
  return WEEKDAYS[dayToDate(day).getDay()]!;
}

/** The natural dates for a horizon around today. */
export function horizonDates(horizon: 'year' | 'quarter' | 'month' | 'week', today: Day): { startDate: Day; endDate: Day } {
  const y = year(today);
  if (horizon === 'year') return { startDate: makeDay(y, 1, 1), endDate: makeDay(y, 12, 31) };
  if (horizon === 'quarter') {
    const q = Math.floor((month(today) - 1) / 3);
    return { startDate: makeDay(y, q * 3 + 1, 1), endDate: makeDay(y, q * 3 + 3, daysInMonth(y, q * 3 + 3)) };
  }
  if (horizon === 'month') return { startDate: makeDay(y, month(today), 1), endDate: makeDay(y, month(today), daysInMonth(y, month(today))) };
  const start = startOfWeek(today);
  return { startDate: start, endDate: addDays(start, 6) };
}
