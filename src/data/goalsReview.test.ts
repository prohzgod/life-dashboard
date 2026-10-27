// @vitest-environment node
import Dexie from 'dexie';
import { addDays, startOfWeek, toDay } from '@/domain/days';
import { saveDailyEntry } from './checkIns';
import { LifeDb } from './db';
import {
  addCatchUpTask,
  addKeyResult,
  addMilestone,
  createGoal,
  goalConnections,
  loadGoalBoard,
  logGoalValue,
  saveVision,
  setGoalStatus,
  toggleMilestone,
  updateKeyResult,
} from './goalActions';
import { listFocusGoals } from './goalQueries';
import { loadProgressData, loadWheelOfLife, saveAreaRatings } from './progressQueries';
import { goalsRepo, nodesRepo, tasksRepo } from './repositories';
import { completeWeeklyReview, listReviewedWeeks, loadWeekData, openWeeklyReview, readAnswers, saveReviewAnswers, setWeekFocus } from './reviewActions';
import { captureTask, completeTask } from './taskActions';
import { areasRepo } from './repositories';
import { freshDatabase } from './testing';

const today = toDay(new Date());

beforeEach(freshDatabase);

const yearGoal = async () => (await goalsRepo.listRoots())[0]!;

describe('goals', () => {
  it('logs values with history and shows progress and pace on the board', async () => {
    const goal = await yearGoal();
    await logGoalValue(goal.id, 8);
    await logGoalValue(goal.id, 13);
    const updated = (await goalsRepo.get(goal.id))!;
    expect(updated.currentValue).toBe(13);
    expect(updated.progressLog.map((e) => e.value)).toEqual([8, 13]);

    const board = await loadGoalBoard(today);
    const view = board.views.find((v) => v.goal.id === goal.id)!;
    expect(view.progress.percent).toBeCloseTo((13 / 21.1) * 100);
    expect(['on-pace', 'behind']).toContain(view.pace.state);
  });

  it('measures milestones and key results', async () => {
    const goal = await createGoal({
      title: 'Visit Japan with family', why: '', areaId: null, parentGoalId: null, horizon: 'year', type: 'milestone',
      progressMethod: 'milestones', startValue: null, targetValue: null, unit: null, startDate: today, endDate: addDays(today, 300), commitment: 'committed',
    });
    const [a] = [await addMilestone(goal.id, 'Passports', null), await addMilestone(goal.id, 'Flights', null)];
    await toggleMilestone(a.id);
    let view = (await loadGoalBoard(today)).views.find((v) => v.goal.id === goal.id)!;
    expect(view.progress).toMatchObject({ percent: 50, done: 1, total: 2 });

    const okr = await createGoal({ ...goal, title: 'Ship side project', progressMethod: 'keyResultAverage', type: 'okr', commitment: 'aspirational' });
    const kr = await addKeyResult(okr.id, 'Users', 100);
    await updateKeyResult(kr.id, 55);
    view = (await loadGoalBoard(today)).views.find((v) => v.goal.id === okr.id)!;
    expect(view.progress.score).toBeCloseTo(0.55);
  });

  it('saves the year’s vision and word, and keeps it off the goal list', async () => {
    await saveVision(today, { statement: 'Healthy, curious, and present.' });
    await saveVision(today, { word: 'Present' });
    const board = await loadGoalBoard(today);
    expect(board.vision).toMatchObject({ title: 'Healthy, curious, and present.', wordOfYear: 'Present', horizon: 'vision' });
    expect(board.views.some((v) => v.goal.horizon === 'vision')).toBe(false);
  });

  it('adds a catch-up task linked to a goal that is behind', async () => {
    const goal = await createGoal({
      title: 'Read 24 books', why: '', areaId: null, parentGoalId: null, horizon: 'year', type: 'target', progressMethod: 'metric',
      startValue: 0, targetValue: 24, unit: 'books', startDate: addDays(today, -200), endDate: addDays(today, 165), commitment: 'committed',
    });
    await addCatchUpTask(goal, today);
    const [task] = await tasksRepo.list((t) => t.goalId === goal.id);
    expect(task).toMatchObject({ doOn: today, status: 'open' });
    expect(task!.title).toMatch(/^Read 24 books: /);
    expect((await goalConnections(goal.id)).openTasks).toBe(1);
  });

  it('marks goals done', async () => {
    const goal = await yearGoal();
    await setGoalStatus(goal.id, 'done');
    expect((await loadGoalBoard(today)).views.find((v) => v.goal.id === goal.id)!.pace.sentence).toBe('Done');
  });
});

describe('weekly review', () => {
  it('opens one review per week and saves answers', async () => {
    const review = await openWeeklyReview(today);
    expect((await openWeeklyReview(today)).id).toBe(review.id);
    await saveReviewAnswers(review.id, { wentWell: 'Hit every run.', step: 3 });
    const again = await openWeeklyReview(today);
    expect(readAnswers(again)).toMatchObject({ wentWell: 'Hit every run.', step: 3, drained: '' });
  });

  it('sums up the week', async () => {
    const review = await openWeeklyReview(today);
    const day = review.periodStart;
    await saveDailyEntry(day, { mood: 4, energy: 3, sleepMinutes: 420, line: 'Good start' });
    const task = await captureTask('Call Mom', { today: day, status: 'open', defaultDoOn: day });
    await completeTask(task.id, day);
    const data = await loadWeekData(review.periodStart, today);
    expect(data.summary.avgMood).toBe(4);
    expect(data.summary.journalDays).toBe(1);
    expect(data.draft.length).toBeGreaterThan(10);
  });

  it('turns picks into next week’s focus goals, replacing earlier picks', async () => {
    const review = await openWeeklyReview(today);
    const year = await yearGoal();
    await setWeekFocus(review, [{ parentGoalId: year.id, title: 'Run 3× this week' }, { parentGoalId: null, title: 'Draft essay #9' }]);
    await setWeekFocus((await openWeeklyReview(today)), [{ parentGoalId: year.id, title: 'Run 3× this week' }]);
    const week = await goalsRepo.list((g) => g.horizon === 'week');
    expect(week.map((g) => g.title)).toEqual(['Run 3× this week']);
    expect(week[0]).toMatchObject({ parentGoalId: year.id, areaId: year.areaId, startDate: addDays(review.periodStart, 7) });

    const focus = await listFocusGoals(addDays(review.periodStart, 8));
    expect(focus).toMatchObject({ fromReview: true });
    expect(focus.goals.map((g) => g.title)).toEqual(['Run 3× this week']);
  });

  it('finishes into the Sunday journal page and ticks off the review task', async () => {
    const review = await openWeeklyReview(today);
    await saveReviewAnswers(review.id, { wentWell: 'Two phone-free evenings.', summary: 'A steady week.' });
    await completeWeeklyReview(review.id, today);

    expect(await listReviewedWeeks()).toEqual([review.periodStart]);
    const sunday = addDays(review.periodStart, 6);
    const page = (await nodesRepo.list((n) => n.systemKey === `journal:${sunday}`))[0]!;
    expect(page.contentText).toContain('Weekly review');
    expect(page.contentText).toContain('Two phone-free evenings.');
    expect(page.contentText).toContain('A steady week.');

    // The seeded weekly review task is due on the coming Sunday; it's done once that week's review is.
    const reviewTask = (await tasksRepo.list((t) => t.title === 'Weekly review'))[0]!;
    const due = reviewTask.doOn!;
    expect(due >= startOfWeek(today)).toBe(true);
  });
});

describe('progress data', () => {
  it('collects check-ins, completions, habits and reviews', async () => {
    await saveDailyEntry(today, { mood: 3 });
    const task = await captureTask('A', { today, status: 'open', defaultDoOn: today });
    await completeTask(task.id, today);
    const data = await loadProgressData();
    expect(data.entries).toHaveLength(1);
    expect(data.completedDays).toEqual([today]);
    expect(data.habits.map((h) => h.title)).toEqual(['Meditate', 'Read 20 pages', 'Water']);
  });

  it('rates the wheel of life and compares with a quarter before', async () => {
    const areas = await areasRepo.listOrdered();
    await saveAreaRatings('2026-07-01', new Map(areas.map((a) => [a.id, 5])));
    await saveAreaRatings('2026-10-20', new Map(areas.map((a, i) => [a.id, i + 3])));
    await saveAreaRatings('2026-10-20', new Map([[areas[0]!.id, 9]]));
    const wheel = await loadWheelOfLife();
    expect(wheel.ratedOn).toBe('2026-10-20');
    expect(wheel.beforeOn).toBe('2026-07-01');
    expect(wheel.now.get(areas[0]!.id)).toBe(9);
    expect(wheel.now.size).toBe(1); // today's second save replaced the first
    expect(wheel.before.get(areas[1]!.id)).toBe(5);
  });
});

describe('schema v3 → v4', () => {
  it('gives goals an empty log and no word', async () => {
    const name = 'migration-v4';
    const v3 = new Dexie(name);
    v3.version(3).stores({ goals: 'id, spaceId, areaId, parentGoalId, horizon, status, updatedAt' });
    await v3.table('goals').add({ id: 'g', title: 'Old goal', deletedAt: null });
    v3.close();
    const db = new LifeDb(name);
    expect(await db.goals.get('g')).toMatchObject({ progressLog: [], wordOfYear: null });
    db.close();
    await Dexie.delete(name);
  });
});
