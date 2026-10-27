import { addDays, type Day, diffDays } from './days';

export type TaskView = 'inbox' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'logbook';

export type TaskLike = {
  id: string;
  status: 'inbox' | 'open' | 'done' | 'someday';
  doOn: Day | null;
  /** Local "HH:MM" the task is set for, if any. */
  time?: string | null;
  priority: 1 | 2 | 3 | null;
  sortKey: string;
  parentTaskId: string | null;
  completedAt: string | null;
  /** Local day it was completed (callers convert completedAt with the device's time zone). */
  completedOn?: Day | null;
};

/** Which list a top-level task belongs to. Subtasks live inside their parent. */
export function inView(task: TaskLike, view: TaskView, today: Day): boolean {
  if (task.parentTaskId) return false;
  switch (view) {
    case 'inbox':
      return task.status === 'inbox';
    case 'today':
      return (task.status === 'open' && !!task.doOn && task.doOn <= today) || (task.status === 'done' && task.completedOn === today);
    case 'upcoming':
      return task.status === 'open' && !!task.doOn && task.doOn > today;
    case 'anytime':
      return task.status === 'open' && !task.doOn;
    case 'someday':
      return task.status === 'someday';
    case 'logbook':
      return task.status === 'done';
  }
}

/** Open tasks for today: Today's count, without the ones already done. */
export function isDueToday(task: TaskLike, today: Day): boolean {
  return inView(task, 'today', today) && task.status === 'open';
}

/** Days a task has rolled over from its planned day (0 if it hasn't). */
export function rolledOverDays(task: TaskLike, today: Day): number {
  if (task.status !== 'open' || !task.doOn || task.doOn >= today) return 0;
  return diffDays(task.doOn, today);
}

const bySortKey = (a: TaskLike, b: TaskLike) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

/** Timed tasks first by time, then by priority (unset last), then manual order. */
export function compareForDay(a: TaskLike, b: TaskLike): number {
  const time = (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  if (time) return time;
  const priority = (a.priority ?? 9) - (b.priority ?? 9);
  return priority || bySortKey(a, b);
}

export function sortForView<T extends TaskLike>(tasks: readonly T[], view: TaskView): T[] {
  const sorted = [...tasks];
  if (view === 'logbook') return sorted.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  if (view === 'upcoming') return sorted.sort((a, b) => (a.doOn ?? '').localeCompare(b.doOn ?? '') || compareForDay(a, b));
  if (view === 'today') return sorted.sort(compareForDay);
  return sorted.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9) || bySortKey(a, b));
}

/** Upcoming tasks grouped by day, in date order. */
export function groupByDay<T extends TaskLike>(tasks: readonly T[]): Array<{ day: Day; tasks: T[] }> {
  const groups = new Map<Day, T[]>();
  for (const task of sortForView(tasks, 'upcoming')) {
    if (!task.doOn) continue;
    groups.set(task.doOn, [...(groups.get(task.doOn) ?? []), task]);
  }
  return [...groups].map(([day, list]) => ({ day, tasks: list }));
}

export function countViews(tasks: readonly TaskLike[], today: Day): Record<TaskView, number> {
  const views: TaskView[] = ['inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook'];
  return Object.fromEntries(
    views.map((view) => [view, tasks.filter((t) => inView(t, view, today) && (view !== 'today' || t.status === 'open')).length]),
  ) as Record<TaskView, number>;
}

/** The days in the next `days` days, for an Upcoming preview. */
export function upcomingWindow(today: Day, days: number): { from: Day; to: Day } {
  return { from: addDays(today, 1), to: addDays(today, days) };
}
