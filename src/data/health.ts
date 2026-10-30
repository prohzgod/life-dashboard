import { LOCALES, messages } from '@/i18n/locale';
import { generateKeyBetween } from 'fractional-indexing';
import { addDays, toDay, type Day } from '@/domain/days';
import {
  dailyAverage,
  dayValue,
  lastTimeToday,
  latestWithChange,
  sleepMoodPattern,
  sleepNights,
  sleepSummary,
  workoutMonth,
  type SleepMood,
} from '@/domain/health';
import { saveDailyEntry } from './checkIns';
import { db } from './db';
import { logGoalValue } from './goalActions';
import { areasRepo, dailyEntriesRepo, goalsRepo, habitsRepo, metricEntriesRepo, metricsRepo, workoutsRepo } from './repositories';
import type { Goal, Habit, Metric, MetricEntry, Workout } from './types';

export class HealthError extends Error {}

type SystemKey = NonNullable<Metric['systemKey']>;

const SYSTEM: Record<SystemKey, Pick<Metric, 'aggregation'>> = {
  steps: { aggregation: 'sum' },
  restingHr: { aggregation: 'last' },
  weight: { aggregation: 'last' },
};

/** Steps, resting heart rate and weight exist from the start, so entries have somewhere to go. */
export async function ensureHealthMetrics(): Promise<void> {
  await db.transaction('rw', db.metrics, async () => {
    const existing = await metricsRepo.list((m) => m.systemKey !== null);
    for (const key of Object.keys(SYSTEM) as SystemKey[]) {
      if (existing.some((m) => m.systemKey === key)) continue;
      await metricsRepo.create({ ...SYSTEM[key], ...messages().seed.metrics[key], valueType: 'number', target: null, systemKey: key, step: 1, sortKey: 'a0' });
    }
  });
}

const bySortKey = (a: Metric, b: Metric) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

export async function listCustomMetrics(): Promise<Metric[]> {
  return (await metricsRepo.list((m) => m.systemKey === null)).sort(bySortKey);
}

export type MetricInput = Pick<Metric, 'name' | 'unit' | 'valueType' | 'aggregation' | 'target' | 'step'>;

export async function addMetric(input: MetricInput): Promise<Metric> {
  const name = input.name.trim();
  if (!name) throw new HealthError(messages().errors.health.name);
  if (input.step <= 0) throw new HealthError(messages().errors.health.step);
  const last = (await listCustomMetrics()).at(-1)?.sortKey ?? null;
  return metricsRepo.create({ ...input, name, unit: input.unit?.trim() || null, systemKey: null, sortKey: generateKeyBetween(last, null) });
}

export async function updateMetric(id: string, patch: Partial<MetricInput>): Promise<void> {
  if (patch.name !== undefined && !patch.name.trim()) throw new HealthError(messages().errors.health.name);
  await metricsRepo.update(id, patch.name === undefined ? patch : { ...patch, name: patch.name.trim() });
}

/** Removes a metric you made; its entries are kept (soft delete), so an export still has them. */
export async function removeMetric(id: string): Promise<void> {
  const metric = await metricsRepo.get(id);
  if (metric && metric.systemKey === null) await metricsRepo.remove(id);
}

/** Logs a reading now (or at noon of a past day). */
export async function logMetric(metricId: string, value: number, day?: Day): Promise<MetricEntry> {
  if (!Number.isFinite(value)) throw new HealthError(messages().errors.health.number);
  const today = toDay(new Date());
  const at = !day || day === today ? new Date().toISOString() : new Date(`${day}T12:00:00`).toISOString();
  return metricEntriesRepo.create({ metricId, at, value, source: 'manual' });
}

/** Takes back today's latest entry for a metric (an accidental tap). */
export async function undoLastToday(metricId: string): Promise<void> {
  const today = toDay(new Date());
  const last = (await metricEntriesRepo.where('metricId', metricId)).filter((e) => toDay(new Date(e.at)) === today).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  if (last) await metricEntriesRepo.remove(last.id);
}

export async function logSystem(key: SystemKey, value: number, day?: Day): Promise<void> {
  const metric = (await metricsRepo.list((m) => m.systemKey === key))[0];
  if (!metric) throw new HealthError(messages().errors.health.noMetric);
  if (value <= 0) throw new HealthError(messages().errors.health.positive);
  await logMetric(metric.id, value, day);
}

/** Sleep lives in the daily check-in, on the day you woke up. */
export async function logSleep(day: Day, minutes: number): Promise<void> {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) throw new HealthError(messages().errors.health.hours);
  await saveDailyEntry(day, { sleepMinutes: Math.round(minutes) });
}

// ---- Workouts ----

export type WorkoutInput = Pick<Workout, 'day' | 'kind' | 'title' | 'distanceKm' | 'durationSec' | 'avgHr' | 'goalId' | 'notes'>;

/** A goal measured in km takes your longest distance, so a long run moves it on. */
async function countTowardGoal(w: Pick<Workout, 'goalId' | 'distanceKm'>): Promise<void> {
  if (!w.goalId || !w.distanceKm) return;
  const goal = await goalsRepo.get(w.goalId);
  if (goal && goal.unit === 'km' && w.distanceKm > (goal.currentValue ?? goal.startValue ?? 0)) await logGoalValue(goal.id, w.distanceKm);
}

function check(input: Partial<WorkoutInput>) {
  if (input.title !== undefined && !input.title.trim()) throw new HealthError(messages().errors.health.workout);
  if (input.durationSec !== undefined && (!Number.isFinite(input.durationSec) || input.durationSec <= 0)) throw new HealthError(messages().errors.health.duration);
  if (input.distanceKm !== undefined && input.distanceKm !== null && input.distanceKm <= 0) throw new HealthError(messages().errors.health.distance);
}

export async function addWorkout(input: WorkoutInput): Promise<Workout> {
  check(input);
  const w = await workoutsRepo.create({ ...input, title: input.title.trim(), notes: input.notes.trim(), source: 'manual' });
  await countTowardGoal(w);
  return w;
}

export async function updateWorkout(id: string, patch: Partial<WorkoutInput>): Promise<void> {
  check(patch);
  const w = await workoutsRepo.update(id, patch.title === undefined ? patch : { ...patch, title: patch.title.trim() });
  await countTowardGoal(w);
}

export async function deleteWorkout(id: string): Promise<void> {
  await workoutsRepo.remove(id);
}

/** The habit the sleep pattern suggests. */
export async function addBedtimeHabit(): Promise<Habit> {
  const titles = LOCALES.map((locale) => messages(locale).seed.bedtime.title);
  const existing = (await habitsRepo.list((h) => h.archivedAt === null)).find((h) => titles.includes(h.title));
  if (existing) return existing;
  const health = (await areasRepo.list()).find((a) => a.color === 'health');
  const t = messages().seed.bedtime;
  return habitsRepo.create({ areaId: health?.id ?? null, goalId: null, title: t.title, kind: 'yesno', target: 1, unit: null, schedule: { type: 'daily' }, cue: t.cue, archivedAt: null });
}

// ---- The Health screen ----

export type MetricToday = { metric: Metric; today: number | null; lastTime: string | null };

export type HealthView = {
  sleep: { nights: ReturnType<typeof sleepNights>; average: number | null; met: number; logged: number; lastNight: number | null };
  pattern: SleepMood | null;
  hasBedtimeHabit: boolean;
  steps: { average: number | null; today: number | null };
  restingHr: ReturnType<typeof latestWithChange>;
  weight: ReturnType<typeof latestWithChange>;
  workouts: { recent: Workout[]; month: ReturnType<typeof workoutMonth> };
  /** A goal measured in km, for "Counts toward". */
  distanceGoal: Goal | null;
  metrics: MetricToday[];
};

/** Everything the Health screen shows. Read-only, so it's safe in a live query. */
export async function loadHealth(today: Day): Promise<HealthView> {
  const [entries, metrics, allEntries, workouts, goals, habits] = await Promise.all([
    dailyEntriesRepo.list(),
    metricsRepo.list(),
    metricEntriesRepo.list(),
    workoutsRepo.list(),
    goalsRepo.list((g) => g.status === 'active' && g.unit === 'km'),
    habitsRepo.list((h) => h.archivedAt === null),
  ]);
  const entriesOf = (m: Metric | undefined) => (m ? allEntries.filter((e) => e.metricId === m.id) : []);
  const system = (key: SystemKey) => metrics.find((m) => m.systemKey === key);
  const nights = sleepNights(entries, today);
  const steps = entriesOf(system('steps'));
  return {
    sleep: { nights, ...sleepSummary(nights), lastNight: nights.at(-1)?.minutes ?? null },
    pattern: sleepMoodPattern(entries),
    hasBedtimeHabit: habits.some((h) => /in bed by/i.test(h.title)),
    steps: { average: dailyAverage(steps, today, 'sum'), today: dayValue(steps, today, 'sum') },
    restingHr: latestWithChange(entriesOf(system('restingHr')), today),
    weight: latestWithChange(entriesOf(system('weight')), today),
    workouts: { recent: [...workouts].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6), month: workoutMonth(workouts, today.slice(0, 7)) },
    distanceGoal: goals.sort((a, b) => a.endDate.localeCompare(b.endDate))[0] ?? null,
    metrics: metrics
      .filter((m) => m.systemKey === null)
      .sort(bySortKey)
      .map((metric) => {
        const list = entriesOf(metric);
        return { metric, today: dayValue(list, today, metric.aggregation), lastTime: lastTimeToday(list, today) };
      }),
  };
}

/** Steps for the Home tile: today's and the 14-day average. */
export async function stepsSummary(today: Day): Promise<{ today: number | null; average: number | null; week: Array<number | null> }> {
  const metric = (await metricsRepo.list((m) => m.systemKey === 'steps'))[0];
  const list = metric ? await metricEntriesRepo.where('metricId', metric.id) : [];
  return {
    today: dayValue(list, today, 'sum'),
    average: dailyAverage(list, today, 'sum'),
    week: Array.from({ length: 7 }, (_, i) => dayValue(list, addDays(today, i - 6), 'sum')),
  };
}
