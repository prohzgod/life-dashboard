import { expect, test, type Page } from '@playwright/test';

const screens = [
  ['/', /^Good (morning|afternoon|evening)\./],
  ['/inbox', 'Inbox'],
  ['/tasks', 'Today'],
  ['/calendar', 'Calendar'],
  ['/goals', 'Goals'],
  ['/progress', 'Progress'],
  ['/review', 'Weekly review'],
  ['/vision', 'Vision board'],
  ['/finance', 'Finance'],
  ['/health', 'Health'],
  ['/assistant', 'Assistant'],
] as const;

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

test('every screen loads with the sidebar and its empty state', async ({ page }) => {
  for (const [path, title] of screens) {
    await page.goto(path);
    await expect(h1(page)).toHaveText(title);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  }
});

test('sidebar navigation and the ⌘K palette', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Goals' }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(nav.getByRole('link', { name: 'Goals' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: /Search or jump to/ }).click();
  await expect(page.getByRole('combobox', { name: 'Search screens and pages' })).toBeFocused();
  await page.getByRole('combobox', { name: 'Search screens and pages' }).fill('vision');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vision$/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the theme choice is saved on this device', async ({ page }) => {
  await page.goto('/settings/appearance');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: 'System' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
});

test('system theme follows the OS setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(13, 17, 29)'); // --bg in dark
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
  await expect(page.getByText('Offline · everything still works')).toBeVisible();

  // A deep link that was never visited still loads from the cache.
  await page.goto('/vision');
  await expect(h1(page)).toHaveText('Vision board');
  await context.setOffline(false);
});
