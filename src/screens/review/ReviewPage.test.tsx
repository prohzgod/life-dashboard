import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/app/router';
import { addDays, toDay } from '@/domain/days';
import { captureTask, goalsRepo, listFocusGoals, listReviewedWeeks, openWeeklyReview, readAnswers, reviewsRepo } from '@/data';
import { freshDatabase } from '@/data/testing';

const today = toDay(new Date());

function renderReview() {
  const router = createMemoryRouter(routes, { initialEntries: ['/review'] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(freshDatabase);

describe('Weekly review', () => {
  it('walks the five steps, saves answers, sets focus and finishes into the journal', async () => {
    await captureTask('Renew car insurance', { today, status: 'inbox' });
    renderReview();

    // 1 · Get clear
    const steps = await screen.findByRole('list', { name: 'Review steps' });
    expect(within(steps).getByRole('listitem', { current: 'step' })).toHaveTextContent('Get clear');
    await userEvent.click(await screen.findByRole('button', { name: /Accept “Renew car insurance”/ }));
    expect(await screen.findByText('Inbox zero. Nicely done.')).toBeInTheDocument();

    // 2 · Get current
    await userEvent.click(screen.getByRole('button', { name: 'Next: get current' }));
    expect(await screen.findByRole('heading', { name: 'Coming up' })).toBeInTheDocument();

    // 3 · Reflect
    await userEvent.click(screen.getByRole('button', { name: 'Next: reflect' }));
    const wentWell = await screen.findByRole('textbox', { name: 'What went well?' });
    await userEvent.type(wentWell, 'Two phone-free evenings.');
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: 'Insert into review' }));
    expect(await screen.findByText(/In your review\./)).toBeInTheDocument();

    // 4 · Plan
    await userEvent.click(screen.getByRole('button', { name: /^Next: plan week \d+$/ }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Run 10 km without stopping/ }));
    const name = screen.getByRole('textbox', { name: 'This week for Run 10 km without stopping' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Run 3× this week');
    await userEvent.type(screen.getByRole('textbox', { name: 'Your own focus item' }), 'Draft essay #9{Enter}');
    await userEvent.click(screen.getByRole('button', { name: /^Set focus for week/ }));
    expect(await screen.findByText('Saved. These show on Today next week.')).toBeInTheDocument();

    // 5 · Done
    await userEvent.click(screen.getByRole('button', { name: 'Next: wrap up' }));
    expect(await screen.findByText('Two phone-free evenings.')).toBeInTheDocument();
    expect(await screen.findByText('Run 3× this week · Draft essay #9')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Finish review' }));
    expect(await screen.findByRole('heading', { name: 'Review saved' })).toBeInTheDocument();

    // Finished reviews move "open" on to the next week, so read the finished one directly.
    const [finished] = await reviewsRepo.list((r) => r.completedAt !== null);
    expect(await listReviewedWeeks()).toEqual([finished!.periodStart]);
    const focus = await listFocusGoals(addDays(finished!.periodStart, 8));
    expect(focus.goals.map((g) => g.title).sort()).toEqual(['Draft essay #9', 'Run 3× this week']);
  });

  it('remembers the step and answers when you come back later', async () => {
    const review = await openWeeklyReview(today);
    await reviewsRepo.update(review.id, { answers: { ...readAnswers(review), step: 3, drained: 'Back-to-back meetings.' } });
    renderReview();
    expect(await screen.findByRole('textbox', { name: 'What drained you?' })).toHaveValue('Back-to-back meetings.');
    await userEvent.click(screen.getByRole('button', { name: 'Save and finish later' }));
    await waitFor(async () => expect(readAnswers((await reviewsRepo.get(review.id))!).step).toBe(3));
  });

  it('allows at most three focus items', async () => {
    const review = await openWeeklyReview(today);
    await reviewsRepo.update(review.id, { answers: { ...readAnswers(review), step: 4 } });
    renderReview();
    const own = await screen.findByRole('textbox', { name: 'Your own focus item' });
    for (const t of ['One', 'Two', 'Three']) await userEvent.type(own, `${t}{Enter}`);
    expect(own).toBeDisabled();
    expect(screen.getByText('3 of 3 picked')).toBeInTheDocument();
    expect(await goalsRepo.list((g) => g.horizon === 'week')).toHaveLength(0); // nothing saved until you set it
  });
});
