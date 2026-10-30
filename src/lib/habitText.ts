import type { HabitSummary } from '@/domain/habits';
import type { Habit } from '@/data';
import { messages } from '@/i18n';
import { singular } from './format';

/** A habit's check button name, on Today (desktop and phone). */
export function habitCheckLabel(habit: Habit, s: HabitSummary, counted = habit.kind === 'count'): string {
  const t = messages().today.habits;
  if (s.todayDone) return t.undo(habit.title);
  if (counted) return t.addOne(habit.unit ? singular(habit.unit) : '', habit.title, s.todayValue, habit.target);
  return t.checkIn(habit.title);
}
