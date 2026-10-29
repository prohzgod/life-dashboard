// @vitest-environment node
import { saveDailyEntry } from './checkIns';
import { goalsRepo, nodesRepo } from './repositories';
import { completePeriodReview, listReviewedPeriods, loadPeriodData, loadReviewsHub, openPeriodReview, setNextYearWord, setPeriodFocus } from './periodReviews';
import { readAnswers, saveReviewAnswers } from './reviewActions';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

describe('period reviews', () => {
  it('opens the month that just ended, once, and the same review on the next open', async () => {
    const first = await openPeriodReview('month', '2026-11-03');
    expect(first).toMatchObject({ period: 'month', periodStart: '2026-10-01', completedAt: null });
    expect((await openPeriodReview('month', '2026-11-04')).id).toBe(first.id);
    expect((await openPeriodReview('month', '2026-11-04', '2026-09-01')).periodStart).toBe('2026-09-01');
  });

  it('summarizes the period from check-ins', async () => {
    await saveDailyEntry('2026-10-05', { mood: 5, energy: 4 });
    await saveDailyEntry('2026-10-06', { mood: 3 });
    const data = await loadPeriodData('month', '2026-10-01', '2026-11-03');
    expect(data.summary).toMatchObject({ checkInDays: 2, avgMood: 4 });
    expect(data.bestDay?.day).toBe('2026-10-05');
    expect(data.draft).toContain('In October you');
  });

  it('sets next quarter’s goals and finishes into the journal on the last day of the quarter', async () => {
    const review = await openPeriodReview('quarter', '2026-12-20');
    expect(review.periodStart).toBe('2026-10-01');
    await saveReviewAnswers(review.id, { wentWell: 'Ran my first 10 km.', summary: 'A strong quarter.' });
    await setPeriodFocus((await openPeriodReview('quarter', '2026-12-20'))!, [{ parentGoalId: null, title: 'Run a half-marathon' }]);

    const goals = await goalsRepo.list((g) => g.horizon === 'quarter' && g.title === 'Run a half-marathon');
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ startDate: '2027-01-01', endDate: '2027-03-31' });

    await completePeriodReview(review.id);
    expect(await listReviewedPeriods('quarter')).toEqual(['2026-10-01']);
    const page = (await nodesRepo.list((n) => n.systemKey === 'journal:2026-12-31'))[0]!;
    expect(page.contentText).toContain('Quarterly review, Q4 2026');
    expect(page.contentText).toContain('Ran my first 10 km.');
    expect(page.contentText).toContain('Goals for Q1 2027');
    // The summary and answers survive setting the focus.
    expect(readAnswers((await openPeriodReview('quarter', '2026-12-20'))!).summary).toBe('A strong quarter.');
  });

  it('keeps next year’s word on next year’s vision', async () => {
    const review = await openPeriodReview('year', '2026-12-20');
    await setNextYearWord(review, ' Steady ');
    const vision = (await goalsRepo.list((g) => g.horizon === 'vision')).find((g) => g.startDate === '2027-01-01');
    expect(vision?.wordOfYear).toBe('Steady');
  });

  it('lists every kind of review with what is due, and the finished ones', async () => {
    const month = await openPeriodReview('month', '2026-11-03');
    await completePeriodReview(month.id);
    const hub = await loadReviewsHub('2026-11-03');
    expect(hub.slots.map((s) => s.kind)).toEqual(['week', 'month', 'quarter', 'year']);
    expect(hub.slots[1]).toMatchObject({ start: '2026-11-01', name: 'November 2026', state: 'early' });
    // Q3 ended over a month ago, so the quarter on offer is the current one.
    expect(hub.slots[2]).toMatchObject({ start: '2026-10-01', name: 'Q4 2026', state: 'early' });
    expect(hub.past).toEqual([expect.objectContaining({ kind: 'month', name: 'October 2026', journalDay: '2026-10-31' })]);
  });
});
