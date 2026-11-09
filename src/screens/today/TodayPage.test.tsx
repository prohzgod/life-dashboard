import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/app/router';
import { addDays, toDay } from '@/domain/days';
import { captureTask, getDailyEntry, tasksRepo } from '@/data';
import { freshDatabase } from '@/data/testing';

const today = toDay(new Date());

function renderToday() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(freshDatabase);

describe('Today', () => {
  it('keeps the day, week, month and year in words for screen readers and links to planning', async () => {
    renderToday();
    const rhythm = await screen.findByRole('list', { name: 'Your day, week, month and year' });
    expect(within(rhythm).getAllByRole('listitem')).toHaveLength(4);
    expect(within(rhythm).getByRole('listitem', { name: /^Week \d+, day \d\/7$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan my day' })).toHaveAttribute('href', '/tasks?view=anytime');
  });

  it('adds a task with a live preview of what it understood', async () => {
    renderToday();
    const input = await screen.findByRole('textbox', { name: 'Add a task' });
    await userEvent.type(input, 'Call Mom at 18:00 #family !high');

    const preview = screen.getByLabelText('Will be saved as');
    expect(within(preview).getByText('Today, 18:00')).toBeInTheDocument();
    expect(within(preview).getByText('Family')).toBeInTheDocument();
    expect(within(preview).getByText('High priority')).toBeInTheDocument();

    await userEvent.keyboard('{Enter}');
    const list = await screen.findByRole('list', { name: 'Today’s tasks' });
    expect(within(list).getByRole('button', { name: 'Call Mom' })).toBeInTheDocument();
    expect(within(list).getByText('18:00')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(await screen.findByRole('heading', { level: 1, name: /One thing matters today\./ })).toBeInTheDocument();
  });

  it('checks a task off and counts it as done', async () => {
    await captureTask('Water the plants ~5m', { today, status: 'open', defaultDoOn: today });
    renderToday();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Mark “Water the plants” as done' }));
    expect(await screen.findByRole('checkbox', { name: 'Mark “Water the plants” as not done' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('1 / 1 done')).toBeInTheDocument();
  });

  it('says kindly when tasks rolled over, and moves them in one click', async () => {
    await captureTask('Book dentist', { today, status: 'open', defaultDoOn: addDays(today, -1) });
    renderToday();
    expect(await screen.findByText('Rolled over from yesterday')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Plan it for today' }));
    await waitFor(() => expect(screen.queryByText('Rolled over from yesterday')).not.toBeInTheDocument());
    expect((await tasksRepo.list((t) => t.title === 'Book dentist'))[0]!.doOn).toBe(today);
  });

  it('checks in a habit and counts water glass by glass', async () => {
    renderToday();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Check in Meditate for today' }));
    expect(await screen.findByRole('checkbox', { name: 'Undo today’s Meditate' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Add one glass to Water (0 of 8)' }));
    expect(await screen.findByRole('img', { name: '1 of 8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add one glass to Water (1 of 8)' })).toBeInTheDocument();
  });

  it('saves mood, energy, sleep and a line', async () => {
    renderToday();
    await userEvent.click(within(await screen.findByRole('group', { name: 'Mood' })).getByRole('button', { name: 'Good' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Energy' })).getByRole('button', { name: 'Okay' }));
    await userEvent.click(screen.getByRole('button', { name: 'add' }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Hours slept' }), '7');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'One line about today' }), 'Slow morning, good run.{Enter}');

    await waitFor(async () => expect(await getDailyEntry(today)).toMatchObject({ mood: 4, energy: 3, sleepMinutes: 440, line: 'Slow morning, good run.' }));
    expect(screen.getByText('7h 20m')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Mood' })).getByRole('button', { name: 'Good' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('autosaves the line shortly after you stop typing', async () => {
    renderToday();
    await userEvent.type(await screen.findByRole('textbox', { name: 'One line about today' }), 'Still typing');
    await waitFor(async () => expect((await getDailyEntry(today))?.line).toBe('Still typing'), { timeout: 2000 });
  });

  it('shows the sample goal as this week’s stand-in focus', async () => {
    renderToday();
    expect(await screen.findByRole('progressbar', { name: 'Run 10 km without stopping' })).toBeInTheDocument();
    // Only the nearest horizon stands in: the year goal appears as the parent, not as its own bar.
    expect(screen.queryByRole('progressbar', { name: 'Run a half-marathon' })).not.toBeInTheDocument();
    expect(screen.getByText(/^Run a half-marathon: /)).toBeInTheDocument();
    expect(screen.getByText(/Your weekly review picks this week’s focus/)).toBeInTheDocument();
  });
});
