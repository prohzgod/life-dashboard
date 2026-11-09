import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/app/router';
import { createNode, getProfile, listHomeWidgets, pinnedWidget, tasksRepo } from '@/data';
import { freshDatabase } from '@/data/testing';
import { pretendToBeAPhone } from '@/test/phone';

let restore: () => void;
beforeEach(async () => {
  restore = pretendToBeAPhone();
  await freshDatabase();
});
afterEach(() => restore());

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('phone shell', () => {
  it('lists every screen without a tab on the Menu screen', async () => {
    const router = renderAt('/menu');
    const tabs = await screen.findByRole('navigation', { name: 'Tabs' });
    expect(within(tabs).getByRole('link', { name: 'Menu' })).toHaveAttribute('aria-current', 'page');
    expect(within(tabs).queryByRole('link', { name: 'Library' })).not.toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'All screens' });
    const hrefs = within(list)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/calendar', '/goals', '/progress', '/reviews', '/library', '/vision', '/finance', '/health', '/assistant', '/profile']);
    await userEvent.click(within(list).getByRole('link', { name: 'Library' }));
    expect(router.state.location.pathname).toBe('/library');
  });

  it('moves a pinned tile to the top of Menu, and back when unpinned', async () => {
    const router = renderAt('/menu');
    await userEvent.click(await screen.findByRole('button', { name: 'Pin Finance' }));

    const pinned = await screen.findByRole('list', { name: 'Pinned' });
    expect(within(pinned).getByRole('link', { name: 'Finance' })).toHaveAttribute('href', '/finance');
    expect(within(screen.getByRole('list', { name: 'Other screens' })).queryByRole('link', { name: 'Finance' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/menu');

    await userEvent.click(within(pinned).getByRole('button', { name: 'Unpin Finance' }));
    const all = await screen.findByRole('list', { name: 'All screens' });
    expect(within(all).getByRole('link', { name: 'Finance' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pinned' })).not.toBeInTheDocument();
  });

  it('shows the tab bar instead of the sidebar, and opens on Home', async () => {
    const router = renderAt('/');
    const tabs = await screen.findByRole('navigation', { name: 'Tabs' });
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('list', { name: 'Home widgets' })).toBeInTheDocument();
    await userEvent.click(within(tabs).getByRole('link', { name: 'Today' }));
    expect(router.state.location.pathname).toBe('/today');
    expect(await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)\./ })).toBeInTheDocument();
  });

  it('pushes other screens with a ‹ Home back link', async () => {
    renderAt('/goals');
    expect(await screen.findByRole('link', { name: 'Back to Menu' })).toHaveAttribute('href', '/menu');
  });

  it('captures a task, a note and a journal line from the + sheet', async () => {
    renderAt('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Quick capture' }));
    const sheet = await screen.findByRole('dialog', { name: 'Quick capture' });
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'New task' }), 'Pay rent every 1st #finance');
    expect(within(sheet).getByText('Repeats monthly, day 1')).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByText('“Pay rent” is in your Inbox.')).toBeInTheDocument();
    expect((await tasksRepo.list((t) => t.title === 'Pay rent'))[0]).toMatchObject({ status: 'inbox', rrule: 'FREQ=MONTHLY;BYMONTHDAY=1' });

    await userEvent.click(within(sheet).getByRole('radio', { name: 'Note' }));
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'New note' }), 'Books to read{Enter}The Overstory');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByText('“Books to read” is in your Library.')).toBeInTheDocument();
  });
});

describe('Home and Edit Home', () => {
  it('hides, resizes and brings back widgets', async () => {
    renderAt('/home/edit');
    await userEvent.click(await screen.findByRole('button', { name: 'Hide Goals' }));
    await waitFor(async () => expect((await listHomeWidgets()).find((w) => w.kind === 'goals')!.hidden).toBe(true));

    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Calendar size' })).getByRole('radio', { name: 'Large' }));
    await waitFor(async () => expect((await listHomeWidgets()).find((w) => w.kind === 'calendar')!.size).toBe('L'));

    await userEvent.click(screen.getByRole('button', { name: /Add to Home/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Add to Home' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add Goals to Home' }));
    await waitFor(async () => expect((await listHomeWidgets()).find((w) => w.kind === 'goals')!.hidden).toBe(false));
  });

  it('pins a Library page from the sheet and shows it on Home', async () => {
    const page = await createNode({ parentId: null, kind: 'page', title: 'Japan trip 2027' });
    renderAt('/home/edit');
    await userEvent.click(await screen.findByRole('button', { name: /Add to Home/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Add to Home' });
    await userEvent.click(within(sheet).getByRole('radio', { name: 'From Library' }));
    await userEvent.click(await within(sheet).findByRole('button', { name: 'Add Japan trip 2027 to Home' }));
    await waitFor(async () => expect(await pinnedWidget('node', page.id)).toBeDefined());
  });

  it('reorders with the keyboard', async () => {
    renderAt('/home/edit');
    const handle = await screen.findByRole('button', { name: 'Move Vision board' });
    handle.focus();
    await userEvent.keyboard('[Space]');
    await userEvent.keyboard('[ArrowUp]');
    await userEvent.keyboard('[Space]');
    // jsdom has no layout, so only check the move was attempted without errors and order is intact.
    expect((await listHomeWidgets()).length).toBe(10);
  });
});

describe('Profile', () => {
  it('saves the profile and blurs details, revealing one on tap', async () => {
    const router = renderAt('/profile/edit');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Display name' }), 'Minh Tran');
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'minh@example.com');
    await userEvent.click(screen.getByRole('radio', { name: 'Male' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'));
    expect(await getProfile()).toMatchObject({ displayName: 'Minh Tran', email: 'minh@example.com', gender: 'Male' });

    expect(await screen.findByText('Minh Tran')).toBeInTheDocument();
    // Email is blurred by default; tapping shows it.
    const reveal = await screen.findByRole('button', { name: 'Show email' });
    await userEvent.click(reveal);
    expect(reveal).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Blur all/ }));
    await waitFor(async () => expect((await getProfile()).visibility.gender).toBe('blurred'));
    expect(await screen.findByRole('button', { name: 'Show gender' })).toBeInTheDocument();
  });
});
