import { checklistProgress } from '@/domain/blocks';
import { addDays, isoWeek, startOfWeek, toDay, type Day } from '@/domain/days';
import { summarizeHabit } from '@/domain/habits';
import { habitHeatmap } from '@/domain/stats';
import { habitConsistencyBetween } from '@/domain/review';
import { compareForDay, inView } from '@/domain/tasks';
import { loadGoalBoard } from './goalActions';
import { habitInput, listHabitData } from './habitActions';
import { listHomeWidgets } from './homeWidgets';
import { listReviewedWeeks } from './reviewActions';
import { areasRepo, dailyEntriesRepo, habitLogsRepo, habitsRepo, nodesRepo, tasksRepo } from './repositories';
import type { HomeWidget } from './types';
import type { Area } from '@design/tokens';

export type PinnedView =
  | { kind: 'node'; id: string; title: string; color: Area | null; label: string | null; done: number; total: number }
  | { kind: 'goal'; id: string; title: string; color: Area | null; percent: number | null; sentence: string }
  | { kind: 'habit'; id: string; title: string; color: Area | null; streak: number; doneToday: boolean }
  | { kind: 'missing'; id: string };

export type HomeData = {
  widgets: HomeWidget[];
  today: { done: number; total: number; next: string | null };
  goals: { top: { title: string; percent: number; color: Area | null } | null; onPace: number; behind: number };
  calendar: { left: number; timed: Array<{ time: string; title: string }> };
  review: { week: number; done: boolean; isSunday: boolean };
  progress: { weeks: Array<Array<number | null>>; consistency: number | null };
  sleep: { last: number | null; week: Array<number | null> };
  vision: { word: string | null };
  pins: Map<string, PinnedView>;
};

/** Everything the Home widgets show, in one read. */
export async function loadHomeData(today: Day): Promise<HomeData> {
  const [widgets, tasks, board, habits, entries, reviewed, areas] = await Promise.all([
    listHomeWidgets(),
    tasksRepo.list(),
    loadGoalBoard(today),
    listHabitData(),
    dailyEntriesRepo.list(),
    listReviewedWeeks(),
    areasRepo.list(),
  ]);
  const withDay = tasks.map((t) => ({ ...t, completedOn: t.completedAt ? toDay(new Date(t.completedAt)) : null }));
  const todays = withDay.filter((t) => inView(t, 'today', today)).sort(compareForDay);
  const open = todays.filter((t) => t.status === 'open');
  const nextTimed = open.find((t) => t.time);
  const color = (areaId: string | null) => areas.find((a) => a.id === areaId)?.color ?? null;

  const active = board.views.filter((v) => v.goal.status === 'active' && v.goal.horizon !== 'week' && v.progress.percent !== null);
  const top = active.find((v) => v.goal.horizon === 'year') ?? active[0];

  const weekStart = startOfWeek(today);
  const twelveWeeksAgo = addDays(weekStart, -77);
  const heat = habitHeatmap(habits, twelveWeeksAgo, today, today).map((w) => w.map((c) => (c ? c.level : null)));
  const totals = habitConsistencyBetween(habits, twelveWeeksAgo, today, today);

  const nights = Array.from({ length: 7 }, (_, i) => entries.find((e) => e.day === addDays(today, i - 6))?.sleepMinutes ?? null);
  const vision = board.vision;

  const pins = new Map<string, PinnedView>();
  for (const w of widgets.filter((x) => x.kind === 'pinned' && x.refId)) {
    const id = w.refId!;
    if (w.refType === 'node') {
      const node = await nodesRepo.get(id);
      const list = node ? checklistProgress(node.contentJson) : null;
      pins.set(w.id, node ? { kind: 'node', id, title: node.title, color: color(node.areaId), label: list?.label ?? null, done: list?.done ?? 0, total: list?.total ?? 0 } : { kind: 'missing', id });
    } else if (w.refType === 'goal') {
      const view = board.views.find((v) => v.goal.id === id);
      pins.set(w.id, view ? { kind: 'goal', id, title: view.goal.title, color: color(view.goal.areaId), percent: view.progress.percent, sentence: view.pace.sentence } : { kind: 'missing', id });
    } else if (w.refType === 'habit') {
      const habit = await habitsRepo.get(id);
      if (!habit) {
        pins.set(w.id, { kind: 'missing', id });
        continue;
      }
      const summary = summarizeHabit(habitInput(habit), await habitLogsRepo.listForHabit(id), today);
      pins.set(w.id, { kind: 'habit', id, title: habit.title, color: color(habit.areaId), streak: summary.streak, doneToday: summary.todayDone });
    }
  }

  return {
    widgets,
    today: {
      done: todays.filter((t) => t.status === 'done').length,
      total: todays.length,
      next: nextTimed ? `${nextTimed.title} at ${nextTimed.time}` : (open[0]?.title ?? null),
    },
    goals: {
      top: top ? { title: top.goal.title, percent: top.progress.percent!, color: color(top.goal.areaId) } : null,
      onPace: active.filter((v) => v.pace.state === 'on-pace').length,
      behind: active.filter((v) => v.pace.state === 'behind').length,
    },
    calendar: { left: open.length, timed: open.filter((t) => t.time).slice(0, 2).map((t) => ({ time: t.time!, title: t.title })) },
    review: { week: isoWeek(today), done: reviewed.includes(weekStart), isSunday: new Date(`${today}T12:00:00`).getDay() === 0 },
    progress: { weeks: heat, consistency: totals.counted ? totals.done / totals.counted : null },
    sleep: { last: nights[6] ?? nights[5] ?? null, week: nights },
    vision: { word: vision?.wordOfYear ?? null },
    pins,
  };
}
