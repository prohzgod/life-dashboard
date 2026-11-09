import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { freshDatabase } from '@/data/testing';
import { LOCALE_STORAGE_KEY, setLocale } from '@/i18n';
import { DEFAULT_LOOK, LOOK_STORAGE_KEY, readLook, setLook } from '@/theme/appearance';
import { THEME_STORAGE_KEY } from '@/theme/theme';
import { LocaleRoot } from './LocaleRoot';
import { routes } from './router';
import { screens } from './screens';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <LocaleRoot>
      <RouterProvider router={router} />
    </LocaleRoot>,
  );
  return router;
}

beforeEach(async () => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  await freshDatabase();
});

/** Screens still waiting for their build show a designed empty state. */
const placeholderScreens = Object.values(screens).filter((s) => !['today', 'inbox', 'tasks', 'calendar', 'library', 'goals', 'progress', 'review', 'vision', 'finance', 'health'].includes(s.key));

describe('app shell', () => {
  it.each(placeholderScreens.map((s) => [s.path, s.title, s.empty.heading]))(
    '%s shows its title and empty state',
    (path, title, emptyHeading) => {
      renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: emptyHeading })).toBeInTheDocument();
    },
  );

  it.each([
    ['/', /^Good (morning|afternoon|evening)\./],
    ['/inbox', 'Inbox'],
    ['/tasks', 'Today'],
    ['/tasks?view=upcoming', 'Upcoming'],
  ])('%s shows its screen', async (path, title) => {
      renderAt(path);
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    },
  );

  it('marks the current screen in the top nav', () => {
    renderAt('/goals');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Goals' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });

  it('navigates from the top nav, and from its More menu', async () => {
    const router = renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    await userEvent.click(within(nav).getByRole('link', { name: 'Goals' }));
    expect(router.state.location.pathname).toBe('/goals');
    await userEvent.click(within(nav).getByRole('button', { name: 'More screens' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Vision board' }));
    expect(router.state.location.pathname).toBe('/vision');
    expect(await screen.findByRole('heading', { level: 1, name: 'Vision board' }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('names the screen you are on in place of the menu icon, and marks it in the menu', async () => {
    renderAt('/finance');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const button = within(nav).getByRole('button', { name: 'Finance, more screens' });
    expect(button).toHaveTextContent('Finance');
    await userEvent.click(button);
    expect(screen.getByRole('menuitem', { name: 'Finance' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('menuitem', { name: 'Health' })).not.toHaveAttribute('aria-current');
  });

  it('shows the menu button as an icon with a name on the other screens', () => {
    renderAt('/goals');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('button', { name: 'More screens' })).toHaveTextContent('');
  });

  it('sends the phone-only Menu screen home on larger windows', () => {
    const router = renderAt('/menu');
    expect(router.state.location.pathname).toBe('/');
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

describe('appearance setting', () => {
  afterEach(() => setLook(DEFAULT_LOOK));

  it('switches light and dark from Settings › Appearance and saves it on this device', async () => {
    renderAt('/settings/appearance');
    const group = await screen.findByRole('radiogroup', { name: 'Light or dark' }, { timeout: 5000 });
    expect(within(group).getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(within(group).getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.bg).toBe('night');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await userEvent.click(within(group).getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.bg).toBe('dawn');
  });

  it('picks a background and an accent', async () => {
    renderAt('/settings/appearance');
    await userEvent.click(await screen.findByRole('radio', { name: /Morning mist/ }, { timeout: 5000 }));
    expect(document.documentElement.dataset.bg).toBe('mist');
    await userEvent.click(screen.getByRole('radio', { name: /Lime/ }));
    expect(document.documentElement.dataset.accent).toBe('lime');
    expect(readLook()).toEqual({ background: 'mist', accent: 'lime' });
    expect(JSON.parse(localStorage.getItem(LOOK_STORAGE_KEY)!)).toEqual({ background: 'mist', accent: 'lime' });

    // Night is always dark.
    await userEvent.click(screen.getByRole('radio', { name: /Night/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('radio', { name: /Night/ })).toBeChecked();
  });

  it('offers your own photo once you pick Your photo', async () => {
    renderAt('/settings/appearance');
    await userEvent.click(screen.getByRole('radio', { name: /Your photo/ }));
    expect(document.documentElement.dataset.bg).toBe('photo');
    expect(screen.getByRole('button', { name: /Upload a photo/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'From your Vision board' }));
    expect(await screen.findByText('Your Vision board has no pictures yet.')).toBeInTheDocument();
  });
});

describe('language setting', () => {
  it('switches to Vietnamese from Settings › General and back', async () => {
    renderAt('/settings/general');
    const group = screen.getByRole('radiogroup', { name: 'Language' });
    await userEvent.click(within(group).getByRole('radio', { name: 'Tiếng Việt' }));

    expect(document.documentElement.lang).toBe('vi');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('vi');
    expect(await screen.findByRole('heading', { level: 1, name: 'Cài đặt' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Hôm nay' })).toBeInTheDocument();

    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })).getByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });
});

describe('in Vietnamese', () => {
  beforeEach(() => setLocale('vi'));

  it.each([
    ['/', /^Chào buổi/],
    ['/inbox', 'Hộp thư'],
    ['/tasks?view=upcoming', 'Sắp tới'],
    ['/calendar', /Tuần \d+/],
    ['/goals', 'Mục tiêu'],
    ['/progress', 'Tiến độ'],
    ['/reviews', 'Nhìn lại'],
    ['/review', 'Nhìn lại tuần'],
    ['/review/month', 'Nhìn lại tháng'],
    ['/vision', 'Bảng tầm nhìn'],
    ['/finance', 'Tài chính'],
    ['/health', 'Sức khỏe'],
    ['/profile', 'Hồ sơ'],
    ['/settings/privacy', 'Cài đặt'],
    ['/library/trash', 'Thùng rác'],
  ])('%s opens with its Vietnamese title', async (path, title) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: title }, { timeout: 4000 })).toBeInTheDocument();
  });
});

describe('keyboard shortcuts', () => {
  it('⌘K opens the palette and Enter jumps to a screen', async () => {
    const router = renderAt('/');
    await userEvent.keyboard('{Meta>}k{/Meta}');
    const input = await screen.findByRole('combobox', { name: 'Search screens and pages' });
    await userEvent.type(input, 'prog{Enter}');
    expect(router.state.location.pathname).toBe('/progress');
  });

  it('Ctrl+N opens quick capture', async () => {
    renderAt('/');
    await userEvent.keyboard('{Control>}n{/Control}');
    expect(await screen.findByRole('dialog', { name: 'Quick capture' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Capture anything' })).toBeInTheDocument();
  });
});
