import type { Day } from '@/domain/days';
import { isLogDone, summarizeHabit, type HabitSummary } from '@/domain/habits';
import type { HabitData } from '@/domain/review';
import { toDay } from '@/domain/days';
import { db } from './db';
import { habitLogsRepo, habitsRepo } from './repositories';
import type { Habit, HabitLog } from './types';

export type HabitWithSummary = { habit: Habit; summary: HabitSummary };

export function habitInput(habit: Habit) {
  return { kind: habit.kind, target: habit.target, schedule: habit.schedule, startDay: toDay(new Date(habit.createdAt)) };
}

/** Live habits with their streak, consistency and last 7 days. */
export async function listHabitsWithSummaries(today: Day): Promise<HabitWithSummary[]> {
  const habits = (await habitsRepo.list((h) => h.archivedAt === null)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const logs = await habitLogsRepo.list();
  return habits.map((habit) => ({
    habit,
    summary: summarizeHabit(habitInput(habit), logs.filter((l) => l.habitId === habit.id), today),
  }));
}

async function logFor(habitId: string, day: Day): Promise<HabitLog | undefined> {
  const rows = await db.habitLogs.where('[habitId+day]').equals([habitId, day]).toArray();
  return rows.find((r) => r.deletedAt === null);
}

/**
 * The one tap on a habit tile. Yes/no: done ↔ not done. Count: +1 until the target, then a tap clears the day.
 */
export async function tapHabit(habit: Habit, day: Day): Promise<void> {
  const log = await logFor(habit.id, day);
  const counted = habit.kind === 'count' || habit.kind === 'duration';
  if (log && isLogDone(habit, log)) {
    await habitLogsRepo.remove(log.id);
    return;
  }
  if (!counted) {
    if (log) await habitLogsRepo.update(log.id, { status: 'done', value: 1 });
    else await habitLogsRepo.create({ habitId: habit.id, day, value: 1, status: 'done' });
    return;
  }
  const value = (log?.status === 'done' ? log.value : 0) + 1;
  if (log) await habitLogsRepo.update(log.id, { status: 'done', value });
  else await habitLogsRepo.create({ habitId: habit.id, day, value, status: 'done' });
}

/** Marks a day as skipped on purpose: it neither counts nor breaks the streak. */
export async function skipHabitDay(habit: Habit, day: Day): Promise<void> {
  const log = await logFor(habit.id, day);
  if (log) await habitLogsRepo.update(log.id, { status: 'skipped', value: 0 });
  else await habitLogsRepo.create({ habitId: habit.id, day, value: 0, status: 'skipped' });
}

/** Habits with their logs, in the shape the stats in src/domain expect. */
export async function listHabitData(): Promise<HabitData[]> {
  const [habits, logs] = await Promise.all([habitsRepo.list((h) => h.archivedAt === null), habitLogsRepo.list()]);
  return habits.map((h) => ({ id: h.id, title: h.title, input: habitInput(h), logs: logs.filter((l) => l.habitId === h.id) }));
}
