// @vitest-environment node
import { addDays, toDay } from '@/domain/days';
import { exportAll, importReplacingAll } from './backup';
import { saveDailyEntry } from './checkIns';
import { db } from './db';
import {
  addBedtimeHabit,
  addMetric,
  addWorkout,
  deleteWorkout,
  ensureHealthMetrics,
  HealthError,
  listCustomMetrics,
  loadHealth,
  logMetric,
  logSleep,
  logSystem,
  removeMetric,
  stepsSummary,
  undoLastToday,
} from './health';
import { goalsRepo, habitsRepo, metricsRepo } from './repositories';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);
const today = toDay(new Date());

describe('metrics', () => {
  it('start with steps, resting heart rate and weight, once', async () => {
    const system = await metricsRepo.list((m) => m.systemKey !== null);
    expect(system.map((m) => m.systemKey).sort()).toEqual(['restingHr', 'steps', 'weight']);
    await ensureHealthMetrics();
    expect(await metricsRepo.list((m) => m.systemKey !== null)).toHaveLength(3);
    expect(await listCustomMetrics()).toEqual([]);
  });

  it('add your own, log taps, undo one, and remove it', async () => {
    const water = await addMetric({ name: ' Water ', unit: 'glasses', valueType: 'number', aggregation: 'sum', target: 8, step: 1 });
    await expect(addMetric({ name: '', unit: null, valueType: 'number', aggregation: 'sum', target: null, step: 1 })).rejects.toThrow(HealthError);
    await logMetric(water.id, 1);
    await logMetric(water.id, 1);
    await logMetric(water.id, 1);
    await undoLastToday(water.id);
    const view = await loadHealth(today);
    expect(view.metrics).toEqual([expect.objectContaining({ metric: expect.objectContaining({ name: 'Water' }), today: 2 })]);
    expect(view.metrics[0]!.lastTime).toMatch(/^\d\d:\d\d$/);
    await removeMetric(water.id);
    expect(await listCustomMetrics()).toEqual([]);
  });

  it('summarise steps, heart rate and weight', async () => {
    await logSystem('steps', 8000, addDays(today, -1));
    await logSystem('steps', 3180);
    await logSystem('weight', 69.6, addDays(today, -60));
    await logSystem('weight', 68.4);
    await logSystem('restingHr', 58);
    await expect(logSystem('weight', 0)).rejects.toThrow('Enter a number above zero.');
    const view = await loadHealth(today);
    expect(view.steps).toEqual({ average: 5590, today: 3180 });
    expect(view.weight!.latest).toBe(68.4);
    expect(view.weight!.change).toBeCloseTo(-1.2);
    expect(view.restingHr).toEqual({ latest: 58, change: null, since: null });
    expect((await stepsSummary(today)).week.at(-1)).toBe(3180);
  });
});

describe('sleep', () => {
  it('is logged in the check-in and compared with next-day mood', async () => {
    await logSleep(today, 424);
    await expect(logSleep(today, 0)).rejects.toThrow(HealthError);
    for (let i = 1; i <= 5; i++) await saveDailyEntry(addDays(today, -i), { sleepMinutes: 450, mood: 4 });
    for (let i = 6; i <= 10; i++) await saveDailyEntry(addDays(today, -i), { sleepMinutes: 380, mood: 3 });
    const view = await loadHealth(today);
    expect(view.sleep).toMatchObject({ lastNight: 424, met: 6, logged: 11 });
    expect(view.pattern).toMatchObject({ diff: 1, restedDays: 5, shortDays: 5 });
    expect(view.hasBedtimeHabit).toBe(false);
    await addBedtimeHabit();
    await addBedtimeHabit();
    expect((await habitsRepo.list()).filter((h) => h.title === 'In bed by 23:00')).toHaveLength(1);
    expect((await loadHealth(today)).hasBedtimeHabit).toBe(true);
  });
});

describe('workouts', () => {
  it('list newest first, sum the month, and move a km goal by your longest run', async () => {
    const goal = (await goalsRepo.list((g) => g.unit === 'km'))[0]!;
    const before = goal.currentValue ?? 0;
    await addWorkout({ day: addDays(today, -3), kind: 'yoga', title: 'Yoga', distanceKm: null, durationSec: 3600, avgHr: null, goalId: null, notes: '' });
    const long = await addWorkout({ day: today, kind: 'run', title: 'Long run', distanceKm: before + 2, durationSec: 4325, avgHr: 148, goalId: goal.id, notes: '' });
    await expect(addWorkout({ day: today, kind: 'run', title: 'Bad', distanceKm: 5, durationSec: 0, avgHr: null, goalId: null, notes: '' })).rejects.toThrow(HealthError);
    const view = await loadHealth(today);
    expect(view.workouts.recent.map((w) => w.title)).toEqual(['Long run', 'Yoga']);
    expect(view.distanceGoal?.id).toBe(goal.id);
    expect((await goalsRepo.get(goal.id))!.currentValue).toBe(before + 2);
    await deleteWorkout(long.id);
    expect((await loadHealth(today)).workouts.recent).toHaveLength(1);
  });
});

describe('older data', () => {
  it('fills in new metric fields from older exports', async () => {
    const file = await exportAll();
    file.tables.metrics = [{ id: 'old', spaceId: (await metricsRepo.list())[0]!.spaceId, createdAt: 'x', updatedAt: 'x', deletedAt: null, name: 'Coffee', unit: 'cups', valueType: 'number', aggregation: 'sum', target: null }];
    await importReplacingAll(file);
    expect(await db.metrics.get('old')).toMatchObject({ systemKey: null, step: 1 });
    expect((await metricsRepo.list((m) => m.systemKey !== null)).length).toBe(3);
  });
});
