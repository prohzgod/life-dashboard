import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/app/router';
import { addDays, toDay } from '@/domain/days';
import { formatDayShort } from '@/lib/format';
import { areasRepo, captureTask, tagsForTask, tasksRepo } from '@/data';
import { freshDatabase } from '@/data/testing';

const today = toDay(new Date());

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(freshDatabase);

describe('Inbox', () => {
  it('captures to the Inbox and accepts the suggestion', async () => {
    renderAt('/inbox');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Capture anything' }), 'Renew car insurance{Enter}');

    const list = await screen.findByRole('list', { name: 'To triage' });
    expect(within(list).getByText('Task · Finance')).toBeInTheDocument();
    expect(screen.getByText(/^1 to triage\./)).toBeInTheDocument();

    await userEvent.click(within(list).getByRole('button', { name: /Accept “Renew car insurance”/ }));
    await waitFor(() => expect(screen.queryByRole('list', { name: 'To triage' })).not.toBeInTheDocument());
    const [task] = await tasksRepo.list((t) => t.title === 'Renew car insurance');
    const finance = (await areasRepo.list()).find((a) => a.name === 'Finance')!;
    expect(task).toMatchObject({ status: 'open', areaId: finance.id });
    expect(screen.getByText(/Inbox zero/)).toBeInTheDocument();
  });

  it('shows counts in the views list', async () => {
    await captureTask('One', { today, status: 'inbox' });
    await captureTask('Two', { today, status: 'inbox' });
    renderAt('/inbox');
    const views = await screen.findByRole('navigation', { name: 'Views' });
    await waitFor(() => expect(within(views).getByRole('link', { name: /Inbox/ })).toHaveTextContent('Inbox2'));
  });
});

describe('task views and the detail drawer', () => {
  it('lists upcoming tasks by day', async () => {
    await captureTask('Dentist tomorrow at 13:00', { today, status: 'open' });
    renderAt('/tasks?view=upcoming');
    const group = await screen.findByRole('region', { name: formatDayShort(addDays(today, 1)) });
    expect(within(group).getByRole('heading', { name: /^Tomorrow · / })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Dentist' })).toBeInTheDocument();
  });

  it('opens a task and edits it in the drawer', async () => {
    const task = await captureTask('Pay rent #bills', { today, status: 'open', defaultDoOn: today });
    const router = renderAt('/tasks?view=today');
    await userEvent.click(await screen.findByRole('button', { name: 'Pay rent' }));
    expect(router.state.location.search).toContain(`task=${task.id}`);

    const drawer = await screen.findByRole('complementary', { name: 'Task details' });
    const title = await within(drawer).findByRole('textbox', { name: 'Task title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Pay October rent{Enter}');
    await userEvent.selectOptions(within(drawer).getByLabelText('Area'), 'Finance');
    await userEvent.selectOptions(within(drawer).getByLabelText('Repeats'), 'Every year');
    await userEvent.selectOptions(within(drawer).getByLabelText('Priority'), 'High');
    await userEvent.type(within(drawer).getByRole('textbox', { name: 'Add a subtask' }), 'Check balance{Enter}');

    await waitFor(async () =>
      expect(await tasksRepo.get(task.id)).toMatchObject({ title: 'Pay October rent', rrule: 'FREQ=YEARLY', priority: 1 }),
    );
    expect(await within(drawer).findByText('Check balance')).toBeInTheDocument();
    expect(within(drawer).getByText('0 / 1')).toBeInTheDocument();
    expect((await tagsForTask(task.id)).map((t) => t.name)).toEqual(['bills']);

    await userEvent.click(within(drawer).getByRole('button', { name: 'Close details' }));
    expect(router.state.location.search).not.toContain('task=');
  });

  it('deletes from the drawer', async () => {
    const task = await captureTask('Throwaway', { today, status: 'open', defaultDoOn: today });
    renderAt(`/tasks/${task.id}`);
    const drawer = await screen.findByRole('complementary', { name: 'Task details' });
    await userEvent.click(await within(drawer).findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Task details' })).not.toBeInTheDocument());
    expect(await tasksRepo.get(task.id)).toBeUndefined();
  });

  it('filters by area', async () => {
    await captureTask('Run 5 km #health', { today, status: 'open' });
    await captureTask('Pay rent #finance', { today, status: 'open' });
    renderAt('/tasks');
    await userEvent.click(within(await screen.findByRole('navigation', { name: 'Areas' })).getByRole('link', { name: 'Health' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Health' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run 5 km' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay rent' })).not.toBeInTheDocument();
  });
});
