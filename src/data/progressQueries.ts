import { addDays, toDay, type Day } from '@/domain/days';
import type { DayEntryLike, HabitData } from '@/domain/review';
import { listHabitData } from './habitActions';
import { db } from './db';
import { areaRatingsRepo, areasRepo, dailyEntriesRepo, tasksRepo } from './repositories';
import { listReviewedWeeks } from './reviewActions';
import type { AreaRating, LifeArea } from './types';

export type ProgressData = {
  entries: DayEntryLike[];
  completedDays: Day[];
  habits: HabitData[];
  reviewedWeeks: Day[];
  /** The day this space was created, i.e. when you started. */
  since: Day;
};

/** Everything the Progress screen computes from. */
export async function loadProgressData(): Promise<ProgressData> {
  const [entries, tasks, habits, reviewedWeeks, seededAt] = await Promise.all([
    dailyEntriesRepo.list(),
    tasksRepo.list((t) => t.status === 'done' && t.completedAt !== null && !t.parentTaskId),
    listHabitData(),
    listReviewedWeeks(),
    db.meta.get('seededAt'),
  ]);
  return {
    entries,
    completedDays: tasks.map((t) => toDay(new Date(t.completedAt!))),
    habits,
    reviewedWeeks,
    since: typeof seededAt?.value === 'string' ? toDay(new Date(seededAt.value)) : toDay(new Date()),
  };
}

export type WheelOfLife = {
  areas: LifeArea[];
  /** Latest score per area id. */
  now: Map<string, number>;
  /** Scores as they stood about a quarter earlier, if any. */
  before: Map<string, number>;
  ratedOn: Day | null;
  beforeOn: Day | null;
};

/** The latest rating of each area, and the one from about three months before it. */
export async function loadWheelOfLife(): Promise<WheelOfLife> {
  const [areas, ratings] = await Promise.all([areasRepo.listOrdered(), areaRatingsRepo.list()]);
  const days = [...new Set(ratings.map((r) => r.date))].sort();
  const ratedOn = days.at(-1) ?? null;
  const beforeOn = ratedOn ? ([...days].reverse().find((d) => d <= addDays(ratedOn, -80)) ?? null) : null;
  const scoresOn = (day: Day | null) => {
    const map = new Map<string, number>();
    if (!day) return map;
    for (const r of ratings.filter((x) => x.date === day).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))) map.set(r.areaId, r.score);
    return map;
  };
  return { areas, now: scoresOn(ratedOn), before: scoresOn(beforeOn), ratedOn, beforeOn };
}

/** Saves today's 1–10 rating for each area (replacing today's earlier ones). */
export async function saveAreaRatings(today: Day, scores: ReadonlyMap<string, number>): Promise<void> {
  const existing = await areaRatingsRepo.list((r) => r.date === today);
  for (const r of existing) await areaRatingsRepo.remove(r.id);
  for (const [areaId, score] of scores) {
    await areaRatingsRepo.create({ areaId, date: today, score: Math.min(10, Math.max(1, Math.round(score))) } satisfies Omit<AreaRating, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>);
  }
}
