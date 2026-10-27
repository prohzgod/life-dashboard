import { goalPace, goalProgress, catchUp, type GoalPace, type GoalProgress, type ProgressContext } from '@/domain/goals';
import { summarizeHabit } from '@/domain/habits';
import { makeDay, year, type Day } from '@/domain/days';
import { db } from './db';
import { habitInput } from './habitActions';
import { nowIso } from './ids';
import { areasRepo, goalsRepo, habitLogsRepo, habitsRepo, keyResultsRepo, milestonesRepo, tasksRepo } from './repositories';
import type { NewRecord } from './repository';
import { captureTask } from './taskActions';
import type { Goal, KeyResult, LifeArea, Milestone } from './types';

/** Everything goal progress depends on, read once. */
export async function loadProgressContext(today: Day): Promise<Omit<ProgressContext, 'goals'> & { goals: Goal[] }> {
  const [goals, tasks, milestones, keyResults, habits, logs] = await Promise.all([
    goalsRepo.list(),
    tasksRepo.list((t) => t.goalId !== null),
    milestonesRepo.list(),
    keyResultsRepo.list(),
    habitsRepo.list((h) => h.goalId !== null && h.archivedAt === null),
    habitLogsRepo.list(),
  ]);
  const habitConsistency = new Map<string, number[]>();
  for (const habit of habits) {
    const summary = summarizeHabit(habitInput(habit), logs.filter((l) => l.habitId === habit.id), today);
    if (summary.consistency !== null) habitConsistency.set(habit.goalId!, [...(habitConsistency.get(habit.goalId!) ?? []), summary.consistency]);
  }
  return { goals, tasks, milestones, keyResults, habitConsistency };
}

export type GoalView = { goal: Goal; progress: GoalProgress; pace: GoalPace };

export type GoalBoard = {
  views: GoalView[];
  areas: LifeArea[];
  milestones: Milestone[];
  keyResults: KeyResult[];
  vision: Goal | null;
};

/** Goals with progress and pace, for the Goals screen. */
export async function loadGoalBoard(today: Day): Promise<GoalBoard> {
  const [ctx, areas] = await Promise.all([loadProgressContext(today), areasRepo.listOrdered()]);
  const views = ctx.goals
    .filter((g) => g.horizon !== 'vision')
    .map((goal) => {
      const progress = goalProgress(goal, ctx);
      return { goal, progress, pace: goalPace(goal, progress.percent, today) };
    });
  const vision = ctx.goals.find((g) => g.horizon === 'vision' && year(g.startDate) === year(today)) ?? null;
  return { views, areas, milestones: ctx.milestones as Milestone[], keyResults: ctx.keyResults as KeyResult[], vision };
}

export type GoalInput = Pick<
  Goal,
  'title' | 'why' | 'areaId' | 'parentGoalId' | 'horizon' | 'type' | 'progressMethod' | 'startValue' | 'targetValue' | 'unit' | 'startDate' | 'endDate' | 'commitment'
>;

const GOAL_INPUT_FIELDS = [
  'title', 'why', 'areaId', 'parentGoalId', 'horizon', 'type', 'progressMethod', 'startValue', 'targetValue', 'unit', 'startDate', 'endDate', 'commitment',
] as const satisfies ReadonlyArray<keyof GoalInput>;

/** A new goal from the form's fields only (never an id or timestamps from a copied goal). */
export async function createGoal(input: GoalInput): Promise<Goal> {
  const fields = Object.fromEntries(GOAL_INPUT_FIELDS.map((k) => [k, input[k]])) as GoalInput;
  const goal: NewRecord<Goal> = {
    ...fields,
    currentValue: input.startValue,
    status: 'active',
    progressLog: [],
    wordOfYear: null,
  };
  return goalsRepo.create(goal);
}

export async function updateGoal(id: string, patch: Partial<GoalInput>): Promise<void> {
  await goalsRepo.update(id, patch);
}

/** Records a new value for a measured goal, keeping the history for the chart. */
export async function logGoalValue(id: string, value: number): Promise<void> {
  const goal = await goalsRepo.get(id);
  if (!goal || Number.isNaN(value)) return;
  await goalsRepo.update(id, { currentValue: value, progressLog: [...goal.progressLog, { at: nowIso(), value }] });
}

export async function setGoalStatus(id: string, status: Goal['status']): Promise<void> {
  await goalsRepo.update(id, { status });
}

export async function addMilestone(goalId: string, title: string, dueDate: Day | null): Promise<Milestone> {
  return milestonesRepo.create({ goalId, title, dueDate, doneAt: null });
}

export async function toggleMilestone(id: string): Promise<void> {
  const m = await milestonesRepo.get(id);
  if (m) await milestonesRepo.update(id, { doneAt: m.doneAt ? null : nowIso() });
}

export async function deleteMilestone(id: string): Promise<void> {
  await milestonesRepo.remove(id);
}

export async function addKeyResult(goalId: string, title: string, target: number): Promise<KeyResult> {
  return keyResultsRepo.create({ goalId, title, start: 0, target, current: 0, weight: 1 });
}

export async function updateKeyResult(id: string, current: number): Promise<void> {
  await keyResultsRepo.update(id, { current });
}

/** The year's vision statement and word, kept on a vision goal for that year. */
export async function saveVision(today: Day, fields: { statement?: string; word?: string }): Promise<void> {
  await db.transaction('rw', db.goals, async () => {
    const y = year(today);
    const existing = (await goalsRepo.list((g) => g.horizon === 'vision')).find((g) => year(g.startDate) === y);
    const statement = fields.statement?.trim();
    const word = fields.word?.trim();
    if (existing) {
      await goalsRepo.update(existing.id, {
        ...(statement !== undefined ? { title: statement } : {}),
        ...(word !== undefined ? { wordOfYear: word || null } : {}),
      });
      return;
    }
    await goalsRepo.create({
      title: statement ?? '',
      why: '',
      areaId: null,
      parentGoalId: null,
      horizon: 'vision',
      type: 'qualitative',
      progressMethod: 'manual',
      startValue: null,
      targetValue: null,
      currentValue: null,
      unit: null,
      startDate: makeDay(y, 1, 1),
      endDate: makeDay(y, 12, 31),
      status: 'active',
      commitment: 'committed',
      progressLog: [],
      wordOfYear: word || null,
    });
  });
}

/** Adds the goal's catch-up step as a task for today, linked to the goal. */
export async function addCatchUpTask(goal: Goal, today: Day): Promise<void> {
  const ctx = await loadProgressContext(today);
  const progress = goalProgress(goal, ctx);
  const suggestion = catchUp(goal, progress, goalPace(goal, progress.percent, today), today);
  if (!suggestion) return;
  const task = await captureTask(suggestion.taskTitle, { today, status: 'open', defaultDoOn: today });
  await tasksRepo.update(task.id, { goalId: goal.id, areaId: goal.areaId, title: suggestion.taskTitle });
}

/** What's connected to a goal, for the detail panel's tiles. */
export async function goalConnections(goalId: string) {
  const [tasks, habits, nodes, links] = await Promise.all([
    tasksRepo.list((t) => t.goalId === goalId && !t.parentTaskId),
    habitsRepo.list((h) => h.goalId === goalId),
    db.nodes.where('spaceId').equals((await goalsRepo.get(goalId))?.spaceId ?? '').toArray(),
    db.links.toArray(),
  ]);
  const mentionedBy = new Set(links.filter((l) => l.deletedAt === null && l.toType === 'goal' && l.toId === goalId && l.fromType === 'node').map((l) => l.fromId));
  const pages = nodes.filter((n) => n.deletedAt === null && (n.goalId === goalId || mentionedBy.has(n.id)));
  return {
    openTasks: tasks.filter((t) => t.status !== 'done').length,
    doneTasks: tasks.filter((t) => t.status === 'done').length,
    habits: habits.map((h) => h.title),
    notes: pages.filter((n) => !(n.systemKey ?? '').startsWith('journal:')).map((n) => ({ id: n.id, title: n.title })),
    journalMentions: pages.filter((n) => (n.systemKey ?? '').startsWith('journal:')).length,
  };
}

/** Progress at each moment it changed (logged values, milestones, linked tasks), from start to now. */
export async function goalHistory(goalId: string, today: Day): Promise<Array<{ at: string; percent: number }>> {
  const ctx = await loadProgressContext(today);
  const goal = ctx.goals.find((g) => g.id === goalId);
  if (!goal) return [];
  const startAt = new Date(`${goal.startDate}T00:00:00`).toISOString();
  const moments = new Set<string>([startAt]);
  for (const e of goal.progressLog) moments.add(e.at);
  for (const m of ctx.milestones) if (m.goalId === goalId && m.doneAt) moments.add(m.doneAt);
  for (const t of ctx.tasks) if (t.goalId === goalId && t.completedAt) moments.add(t.completedAt);
  const now = nowIso();
  const points = [...moments]
    .filter((at) => at >= startAt && at <= now)
    .sort()
    .map((at) => ({ at, percent: goalProgress(goal, ctx, at).percent ?? 0 }));
  points.push({ at: now, percent: goalProgress(goal, ctx).percent ?? 0 });
  return points;
}
