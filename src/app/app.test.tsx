import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { THEME_STORAGE_KEY } from '@/theme/theme';
import { routes } from './router';
import { screens } from './screens';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('app shell', () => {
  it.each(Object.values(screens).map((s) => [s.path, s.title, s.empty.heading]))(
    '%s shows its title and empty state',
    (path, title, emptyHeading) => {
      renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: emptyHeading })).toBeInTheDocument();
    },
  );

  it('marks the current screen in the sidebar', () => {
    renderAt('/goals');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Goals' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });

  it('navigates from the sidebar', async () => {
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: 'Library & journal' }));
    expect(router.state.location.pathname).toBe('/library');
    expect(screen.getByRole('heading', { level: 1, name: 'Library & journal' })).toBeInTheDocument();
  });

  it('shows a kind not-found page', () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/');
  });

  it('sends /settings and unknown tabs to Privacy & data', () => {
    const router = renderAt('/settings');
    expect(router.state.location.pathname).toBe('/settings/privacy');
  });
});

describe('theme setting', () => {
  it('switches the theme from Settings › Appearance and saves it on this device', async () => {
    renderAt('/settings/appearance');
    const group = screen.getByRole('radiogroup', { name: 'Color theme' });
    expect(within(group).getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(within(group).getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(within(group).getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(within(group).getByRole('radio', { name: 'System' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('keyboard shortcuts', () => {
  it('⌘K opens the palette and Enter jumps to a screen', async () => {
    const router = renderAt('/');
    await userEvent.keyboard('{Meta>}k{/Meta}');
    const input = await screen.findByRole('combobox', { name: 'Search screens' });
    await userEvent.type(input, 'prog{Enter}');
    expect(router.state.location.pathname).toBe('/progress');
  });

  it('Ctrl+N opens quick capture', async () => {
    renderAt('/');
    await userEvent.keyboard('{Control>}n{/Control}');
    expect(await screen.findByRole('heading', { name: 'Capture is almost here' })).toBeInTheDocument();
  });
});
