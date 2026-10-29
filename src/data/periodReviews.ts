import { addDays, isoWeek, makeDay, toDay, year, type Day } from '@/domain/days';
import { goalProgress } from '@/domain/goals';
import {
  draftPeriodSummary,
  nextPeriodName,
  periodEnd,
  periodName,
  periodToReview,
  reviewState,
  shiftPeriod,
  summarizePeriod,
  type PeriodSummary,
  type ReviewPeriod,
} from '@/domain/periods';
import { goalsThatMoved, reviewWeekFor, type GoalMove } from '@/domain/review';
import { db } from './db';
import { loadProgressContext, saveVision } from './goalActions';
import { listHabitData } from './habitActions';
import { nowIso } from './ids';
import { ensureJournalPage, savePageContent } from './library';
import { dailyEntriesRepo, goalsRepo, reviewsRepo, tasksRepo } from './repositories';
import { emptyAnswers, heading, paragraph, readAnswers, setFocusGoals } from './reviewActions';
import { getCurrentSpaceId } from './session';
import type { DailyEntry, Goal, Review } from './types';

/** Starts of every period whose review is done. */
export async function listReviewedPeriods(period: ReviewPeriod | 'week'): Promise<Day[]> {
  return (await reviewsRepo.list((r) => r.period === period && r.completedAt !== null)).map((r) => r.periodStart);
}

async function findReview(period: ReviewPeriod, start: Day): Promise<Review | undefined> {
  const rows = await db.reviews.where('[period+periodStart]').equals([period, start]).toArray();
  return rows.find((r) => r.deletedAt === null && r.spaceId === getCurrentSpaceId());
}

/** The review for the period that's due (or the one starting on `start`), created on first open. */
export async function openPeriodReview(period: ReviewPeriod, today: Day, start?: Day): Promise<Review> {
  const done = new Set(await listReviewedPeriods(period));
  const periodStart = start ?? periodToReview(today, period, (s) => done.has(s));
  return db.transaction('rw', db.reviews, async () => {
    const existing = await findReview(period, periodStart);
    if (existing) return existing;
    return reviewsRepo.create({ period, periodStart, answers: { ...emptyAnswers }, autoSummary: null, completedAt: null });
  });
}

export type PeriodData = {
  summary: PeriodSummary;
  moves: GoalMove[];
  draft: string;
  bestDay: DailyEntry | null;
};

/** The period's numbers, best day, goals that moved, and a draft summary. */
export async function loadPeriodData(period: ReviewPeriod, start: Day, today: Day): Promise<PeriodData> {
  const [tasks, habits, entries, ctx] = await Promise.all([
    tasksRepo.list((t) => t.status === 'done' && t.completedAt !== null),
    listHabitData(),
    dailyEntriesRepo.list(),
    loadProgressContext(today),
  ]);
  const summary = summarizePeriod({ period, start, today, completedDays: tasks.map((t) => toDay(new Date(t.completedAt!))), habits, entries });
  const stamp = (day: Day) => new Date(`${day}T00:00:00`).toISOString();
  const after = stamp(addDays(summary.end, 1));
  const before = stamp(start);
  // A goal counts as stalled when it was under way all period and didn't move.
  const moves = goalsThatMoved(
    ctx.goals
      .filter((g) => g.horizon !== 'vision' && g.horizon !== 'week' && g.status !== 'dropped')
      .map((g) => {
        const then = goalProgress(g, ctx, before).percent;
        return { id: g.id, title: g.title, now: goalProgress(g, ctx, after).percent, weekAgo: then, twoWeeksAgo: then, active: g.status === 'active' && g.startDate <= start };
      }),
  );
  const name = period === 'month' ? periodName(start, period).split(' ')[0]! : periodName(start, period);
  const bestDay = summary.bestDay ? (entries.find((e) => e.day === summary.bestDay!.day) ?? null) : null;
  return { summary, moves, draft: draftPeriodSummary(summary, moves, name), bestDay };
}

/** The next period's 1–3 goals, as goals of that horizon. */
export async function setPeriodFocus(review: Review, items: ReadonlyArray<{ parentGoalId: string | null; title: string }>): Promise<void> {
  const period = review.period as ReviewPeriod;
  const next = shiftPeriod(review.periodStart, period, 1);
  await setFocusGoals(review, items, period, next, periodEnd(next, period));
}

/** Next year's word, kept on next year's vision goal like the one you set on Goals. */
export async function setNextYearWord(review: Review, word: string): Promise<void> {
  await saveVision(makeDay(year(review.periodStart) + 1, 1, 1), { word });
  const latest = await reviewsRepo.get(review.id);
  if (latest) await reviewsRepo.update(review.id, { answers: { ...readAnswers(latest), word: word.trim() } });
}

export const PERIOD_QUESTIONS: Record<ReviewPeriod, { wentWell: string; drained: string; differently: string }> = {
  month: { wentWell: 'What went well this month?', drained: 'What drained you?', differently: 'What will you change next month?' },
  quarter: { wentWell: 'Your biggest wins this quarter', drained: 'What did you learn?', differently: 'What will you stop, start or keep?' },
  year: { wentWell: 'The highlights of your year', drained: 'Your lessons', differently: 'What do you want next year to be about?' },
};

/** Finishes the review: saved, and written into the journal page for the period's last day. */
export async function completePeriodReview(reviewId: string): Promise<void> {
  const review = await reviewsRepo.get(reviewId);
  if (!review || review.completedAt) return;
  const period = review.period as ReviewPeriod;
  const answers = readAnswers(review);
  const questions = PERIOD_QUESTIONS[period];
  const focus = (await Promise.all(answers.focusGoalIds.map((id) => goalsRepo.get(id)))).filter((g): g is Goal => !!g);
  const kind = period === 'month' ? 'Monthly' : period === 'quarter' ? 'Quarterly' : 'Yearly';

  const blocks = [
    heading(`${kind} review, ${periodName(review.periodStart, period)}`),
    ...(answers.summary ? [paragraph(answers.summary)] : []),
    ...(answers.wentWell ? [heading(questions.wentWell, 3), paragraph(answers.wentWell)] : []),
    ...(answers.drained ? [heading(questions.drained, 3), paragraph(answers.drained)] : []),
    ...(answers.differently ? [heading(questions.differently, 3), paragraph(answers.differently)] : []),
    ...(answers.word ? [heading('Word of the year', 3), paragraph(answers.word)] : []),
    ...(focus.length
      ? [heading(`Goals for ${nextPeriodName(review.periodStart, period)}`, 3), ...focus.map((g) => ({ type: 'bulletListItem', props: {}, content: [{ type: 'text', text: g.title, styles: {} }], children: [] }))]
      : []),
  ];
  const page = await ensureJournalPage(periodEnd(review.periodStart, period));
  const existing = Array.isArray(page.contentJson) ? page.contentJson : [];
  await savePageContent(page.id, [...existing, ...blocks]);
  await reviewsRepo.update(reviewId, { completedAt: nowIso(), autoSummary: answers.summary || null });
}

export type ReviewKind = 'week' | ReviewPeriod;

export type ReviewSlot = {
  kind: ReviewKind;
  /** The period this review is about. */
  start: Day;
  name: string;
  state: 'done' | 'ready' | 'early';
  /** Started but not finished. */
  inProgress: boolean;
};

export type PastReview = { id: string; kind: ReviewKind; name: string; completedAt: string; journalDay: Day };

export type ReviewsHub = { slots: ReviewSlot[]; past: PastReview[] };

function kindName(kind: ReviewKind, start: Day): string {
  return kind === 'week' ? `Week ${isoWeek(start)}, ${year(addDays(start, 3))}` : periodName(start, kind);
}

function journalDayOf(kind: ReviewKind, start: Day): Day {
  return kind === 'week' ? addDays(start, 6) : periodEnd(start, kind);
}

/** Every kind of review with the one that's due, and the reviews you've finished. Read-only. */
export async function loadReviewsHub(today: Day): Promise<ReviewsHub> {
  const reviews = await reviewsRepo.list((r) => r.period !== 'day');
  const doneOf = (kind: ReviewKind) => new Set(reviews.filter((r) => r.period === kind && r.completedAt).map((r) => r.periodStart));
  const startedOf = (kind: ReviewKind, start: Day) => reviews.some((r) => r.period === kind && r.periodStart === start && !r.completedAt && readAnswers(r).step > 1);

  const weekDone = doneOf('week');
  const week = reviewWeekFor(today, (w) => weekDone.has(w));
  const slots: ReviewSlot[] = [
    { kind: 'week', start: week, name: kindName('week', week), state: weekDone.has(week) ? 'done' : addDays(week, 6) <= today ? 'ready' : 'early', inProgress: startedOf('week', week) },
    ...(['month', 'quarter', 'year'] as const).map((kind) => {
      const done = doneOf(kind);
      const start = periodToReview(today, kind, (s) => done.has(s));
      return { kind, start, name: kindName(kind, start), state: reviewState(start, kind, today, done.has(start)), inProgress: startedOf(kind, start) };
    }),
  ];

  const past = reviews
    .filter((r) => r.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
    .slice(0, 12)
    .map((r) => {
      const kind = r.period as ReviewKind;
      return { id: r.id, kind, name: kindName(kind, r.periodStart), completedAt: r.completedAt!, journalDay: journalDayOf(kind, r.periodStart) };
    });
  return { slots, past };
}
