import { toDay } from '@/domain/days';
import type { Task } from '@/data';

/** Adds the local day each task was completed on, which the view rules compare against today. */
export function withCompletedOn(tasks: Task[]): Array<Task & { completedOn: string | null }> {
  return tasks.map((t) => ({ ...t, completedOn: t.completedAt ? toDay(new Date(t.completedAt)) : null }));
}
