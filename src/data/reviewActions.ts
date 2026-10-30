import { addDays, isoWeek, toDay, type Day } from '@/domain/days';
import { goalProgress } from '@/domain/goals';
import { draftSummary, goalsThatMoved, reviewWeekFor, summarizeWeek, type GoalMove, type WeekSummary } from '@/domain/review';
import { db } from './db';
import { loadProgressContext } from './goalActions';
import { listHabitData } from './habitActions';
import { nowIso } from './ids';
import { ensureJournalPage, savePageContent } from './library';
import { dailyEntriesRepo, goalsRepo, reviewsRepo, tasksRepo } from './repositories';
import { completeTask } from './taskActions';
import type { DailyEntry, Goal, Review } from './types';

export type ReviewAnswers = {
  step: number;
  wentWell: string;
  drained: string;
  differently: string;
  /** Week goals created as next week's focus. */
  focusGoalIds: string[];
  /** The draft summary, once inserted. */
  summary: string;
  /** Yearly review: next year's word. */
  word: string;
};

export const emptyAnswers: ReviewAnswers = { step: 1, wentWell: '', drained: '', differently: '', focusGoalIds: [], summary: '', word: '' };

export function readAnswers(review: Review): ReviewAnswers {
  return { ...emptyAnswers, ...(review.answers as Partial<ReviewAnswers>) };
}

async function weekReview(weekStart: Day): Promise<Review | undefined> {
  const rows = await db.reviews.where('[period+periodStart]').equals(['week', weekStart]).toArray();
  return rows.find((r) => r.deletedAt === null);
}

/** Mondays of every week whose review is done. */
export async function listReviewedWeeks(): Promise<Day[]> {
  return (await reviewsRepo.list((r) => r.period === 'week' && r.completedAt !== null)).map((r) => r.periodStart);
}

/** The review for the week that's due (see reviewWeekFor), created on first open. */
export async function openWeeklyReview(today: Day): Promise<Review> {
  const done = new Set(await listReviewedWeeks());
  const weekStart = reviewWeekFor(today, (w) => done.has(w));
  return db.transaction('rw', db.reviews, async () => {
    const existing = await weekReview(weekStart);
    if (existing) return existing;
    return reviewsRepo.create({ period: 'week', periodStart: weekStart, answers: { ...emptyAnswers }, autoSummary: null, completedAt: null });
  });
}

/** Merges answers in one transaction, so saving a step and an answer at once never loses either. */
export async function saveReviewAnswers(id: string, patch: Partial<ReviewAnswers>): Promise<void> {
  await db.transaction('rw', db.reviews, async () => {
    const review = await reviewsRepo.get(id);
    if (review) await reviewsRepo.update(id, { answers: { ...readAnswers(review), ...patch } });
  });
}

export type WeekData = {
  summary: WeekSummary;
  moves: GoalMove[];
  draft: string;
  bestDay: DailyEntry | null;
};

/** The week's numbers, best day, goals that moved, and a draft summary. */
export async function loadWeekData(weekStart: Day, today: Day): Promise<WeekData> {
  const [tasks, habits, entries, ctx] = await Promise.all([
    tasksRepo.list((t) => t.status === 'done' && t.completedAt !== null),
    listHabitData(),
    dailyEntriesRepo.list(),
    loadProgressContext(today),
  ]);
  const summary = summarizeWeek({
    weekStart,
    today,
    completedDays: tasks.map((t) => toDay(new Date(t.completedAt!))),
    habits,
    entries,
  });
  const end = addDays(weekStart, 7);
  const stamp = (day: Day) => new Date(`${day}T00:00:00`).toISOString();
  const moves = goalsThatMoved(
    ctx.goals
      .filter((g) => g.horizon !== 'vision' && g.horizon !== 'week' && g.status !== 'dropped')
      .map((g) => ({
        id: g.id,
        title: g.title,
        now: goalProgress(g, ctx, stamp(end)).percent,
        weekAgo: goalProgress(g, ctx, stamp(weekStart)).percent,
        twoWeeksAgo: goalProgress(g, ctx, stamp(addDays(weekStart, -7))).percent,
        active: g.status === 'active' && g.startDate <= addDays(weekStart, -7),
      })),
  );
  const bestDay = summary.bestDay ? (entries.find((e) => e.day === summary.bestDay!.day) ?? null) : null;
  return { summary, moves, draft: draftSummary(summary, moves), bestDay };
}

/**
 * Sets next week's 1–3 focus items as week goals (Today's focus card reads them).
 * Each can follow a bigger goal or stand alone. Re-picking replaces the earlier picks.
 */
export async function setWeekFocus(review: Review, items: ReadonlyArray<{ parentGoalId: string | null; title: string }>): Promise<void> {
  const nextWeek = addDays(review.periodStart, 7);
  await setFocusGoals(review, items, 'week', nextWeek, addDays(nextWeek, 6));
}

/** Replaces a review's focus picks with new goals of the given horizon and dates. */
export async function setFocusGoals(
  review: Review,
  items: ReadonlyArray<{ parentGoalId: string | null; title: string }>,
  horizon: Goal['horizon'],
  startDate: Day,
  endDate: Day,
): Promise<void> {
  const answers = readAnswers(review);
  await db.transaction('rw', [db.goals, db.reviews], async () => {
    for (const id of answers.focusGoalIds) await goalsRepo.remove(id);
    const created: Goal[] = [];
    for (const item of items.slice(0, 3)) {
      const parent = item.parentGoalId ? await goalsRepo.get(item.parentGoalId) : undefined;
      created.push(
        await goalsRepo.create({
          title: item.title.trim() || parent?.title || 'Focus',
          why: '',
          areaId: parent?.areaId ?? null,
          parentGoalId: parent?.id ?? null,
          horizon,
          type: 'milestone',
          progressMethod: 'manual',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
          unit: null,
          startDate,
          endDate,
          status: 'active',
          commitment: 'committed',
          progressLog: [],
          wordOfYear: null,
        }),
      );
    }
    // Read again: other answers may have changed since this review was loaded.
    const latest = await reviewsRepo.get(review.id);
    await reviewsRepo.update(review.id, { answers: { ...readAnswers(latest ?? review), focusGoalIds: created.map((g) => g.id) } });
  });
}

export const paragraph = (text: string) => ({ type: 'paragraph', props: {}, content: [{ type: 'text', text, styles: {} }], children: [] });
export const heading = (text: string, level = 2) => ({ type: 'heading', props: { level }, content: [{ type: 'text', text, styles: {} }], children: [] });

/** Finishes the review: saved, written into the week's Sunday journal page, and the review task ticked off. */
export async function completeWeeklyReview(reviewId: string, today: Day): Promise<void> {
  const review = await reviewsRepo.get(reviewId);
  if (!review || review.completedAt) return;
  const answers = readAnswers(review);
  const sunday = addDays(review.periodStart, 6);
  const focus = (await Promise.all(answers.focusGoalIds.map((id) => goalsRepo.get(id)))).filter((g): g is Goal => !!g);

  const blocks = [
    heading(`Weekly review, week ${isoWeek(review.periodStart)}`),
    ...(answers.summary ? [paragraph(answers.summary)] : []),
    ...(answers.wentWell ? [heading('What went well', 3), paragraph(answers.wentWell)] : []),
    ...(answers.drained ? [heading('What drained me', 3), paragraph(answers.drained)] : []),
    ...(answers.differently ? [heading('Next week I’ll', 3), paragraph(answers.differently)] : []),
    ...(focus.length ? [heading('Focus', 3), ...focus.map((g) => ({ type: 'bulletListItem', props: {}, content: [{ type: 'text', text: g.title, styles: {} }], children: [] }))] : []),
  ];
  const page = await ensureJournalPage(sunday);
  const existing = Array.isArray(page.contentJson) ? page.contentJson : [];
  await savePageContent(page.id, [...existing, ...blocks]);
  await reviewsRepo.update(reviewId, { completedAt: nowIso(), autoSummary: answers.summary || null });

  const reviewTask = (await tasksRepo.list((t) => t.status === 'open' && t.title === 'Weekly review' && !!t.rrule && !!t.doOn && t.doOn <= addDays(sunday, 6)))[0];
  if (reviewTask) await completeTask(reviewTask.id, today);
}
