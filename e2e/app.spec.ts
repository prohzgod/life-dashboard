import { expect, test, type Page } from '@playwright/test';

const screens = [
  ['/', /^Good (morning|afternoon|evening)\./],
  ['/inbox', 'Inbox'],
  ['/tasks', 'Today'],
  ['/calendar', /^Week \d+$/],
  ['/vision', 'Vision board'],
  ['/finance', 'Finance'],
  ['/health', 'Health'],
  ['/assistant', 'Assistant'],
] as const;

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

test('every screen loads with the top nav and its empty state', async ({ page }) => {
  for (const [path, title] of screens) {
    await page.goto(path);
    await expect(h1(page)).toHaveText(title);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  }
});

test('top nav, its More menu, and the ⌘K palette', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Goals' }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(nav.getByRole('link', { name: 'Goals' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('button', { name: 'More screens' }).click();
  await page.getByRole('menuitem', { name: 'Health' }).click();
  await expect(page).toHaveURL(/\/health$/);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Search (⌘K)' }).click();
  await expect(page.getByRole('combobox', { name: 'Search screens and pages' })).toBeFocused();
  await page.getByRole('combobox', { name: 'Search screens and pages' }).fill('vision');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vision$/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the look is saved on this device and applied before first paint', async ({ page }) => {
  await page.goto('/settings/appearance');
  // The swatches are labelled cards with the radio inside; click the card.
  await page.getByText('Morning mist', { exact: true }).click();
  await page.getByText('Lavender', { exact: true }).click();
  await page.getByRole('radio', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-bg', 'night');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'lavender');
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-bg', 'mist');
});

test('Auto follows the OS setting: Night when it is dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-bg', 'night');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(15, 15, 22)'); // --paper under Night
});

test('installable and works with no network', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);

  // Wait until the service worker controls the page, so the app shell is precached.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(h1(page)).toHaveText(/^Good (morning|afternoon|evening)\./);
  await expect(page.getByText('Offline, everything still works')).toBeVisible();
  // The font and the sample photo come from the cache too.
  expect(await page.evaluate(() => document.fonts.check('500 16px "Be Vietnam Pro"'))).toBe(true);
  expect(await page.evaluate(async () => (await fetch('/backgrounds/dawn-hills-tall.jpg')).ok)).toBe(true);

  // A deep link that was never visited still loads from the cache.
  await page.goto('/vision');
  await expect(h1(page)).toHaveText('Vision board');
  await context.setOffline(false);
});
