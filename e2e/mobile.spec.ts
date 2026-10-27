import { expect, test, type Page } from '@playwright/test';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });

test('phones get the tab bar and open on the bento Home', async ({ page }) => {
  await page.goto('/');
  await expect(tabs(page)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  const home = page.getByRole('list', { name: 'Home widgets' });
  await expect(home.getByRole('link', { name: /Weekly review/ })).toBeVisible();
  await home.getByRole('link', { name: /Goals/ }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('Edit Home: drag to reorder, hide, and add back', async ({ page }) => {
  await page.goto('/home/edit');
  const grid = page.getByRole('list', { name: 'Widgets on Home' });
  const titles = () => grid.locator('li').evaluateAll((els) => els.map((el) => el.querySelector('[class*=tileTitle]')?.textContent?.trim()));
  await expect.poll(async () => (await titles())[0]).toBe('Today');

  // Move Vision board to the front with the keyboard (Space to lift, arrows to move, Space to drop).
  const handle = page.getByRole('button', { name: 'Move Vision board' });
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(grid.locator('[class*=dragging]')).toHaveCount(1); // lifted
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowLeft']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(60);
  }
  await page.keyboard.press('Space');
  await expect.poll(async () => (await titles())[0]).toBe('Vision board');

  await page.getByRole('button', { name: 'Hide Sleep' }).click();
  await expect(page.getByRole('button', { name: 'Hide Sleep' })).toHaveCount(0);
  await page.getByRole('button', { name: /Add to Home/ }).click();
  await page.getByRole('dialog', { name: 'Add to Home' }).getByRole('button', { name: 'Add Sleep to Home' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('list', { name: 'Home widgets' }).getByRole('link').first()).toContainText('Vision');
});

test('pin a Library page to Home from its options sheet', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('button', { name: 'New page' }).click();
  await page.getByRole('textbox', { name: 'Page title' }).fill('Japan trip 2027');
  await page.getByRole('textbox', { name: 'Page title' }).press('Enter');
  await expect(tabs(page)).toHaveCount(0); // the editor is full-screen
  await page.locator('.bn-editor').click();
  await page.keyboard.type('## Before we go');
  await page.keyboard.press('Enter');
  await page.keyboard.type('[] Renew passports');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Book flights');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: 'Page options' }).click();
  const sheet = page.getByRole('dialog', { name: 'Options for Japan trip 2027' });
  await sheet.getByRole('switch', { name: 'Pin to Home' }).click();
  await expect(sheet.getByRole('switch', { name: 'Pin to Home' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  const toast = page.getByRole('status').filter({ hasText: 'Pinned to Home' });
  await expect(toast).toBeVisible();
  await toast.getByRole('link', { name: 'View' }).click();
  const pinned = page.getByRole('list', { name: 'Home widgets' }).getByRole('link', { name: /Japan trip 2027/ });
  await expect(pinned).toContainText('Before we go · 0 of 2');
});

test('profile: edit, blur by default, tap to reveal, blur all', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Profile and settings' }).click();
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByRole('textbox', { name: 'Display name' }).fill('Minh Tran');
  await page.getByRole('textbox', { name: 'Email' }).fill('minh@example.com');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Profile', exact: true })).toBeVisible();

  const email = page.getByRole('button', { name: 'Show email' });
  await expect(email.locator('span')).toHaveCSS('filter', 'blur(6px)');
  await email.click();
  await expect(page.locator('button[aria-pressed="true"] span', { hasText: 'minh@example.com' })).toHaveCSS('filter', 'none');

  // Only blurred details so far, so the button offers to show them all; then blur them all again.
  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.getByRole('button', { name: 'Show email' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Blur all' }).click();
  await expect(page.getByRole('button', { name: 'Show name' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile and settings' })).toHaveCount(0); // avatar lives on tab roots
});

test('capture works offline from the + button', async ({ page, context }) => {
  await page.goto('/today');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline · saved here')).toBeVisible();
  await tabs(page).getByRole('button', { name: 'Quick capture' }).click();
  const sheet = page.getByRole('dialog', { name: 'Quick capture' });
  await expect(sheet.getByText('You’re offline.', { exact: false })).toBeVisible();
  await sheet.getByRole('textbox', { name: 'New task' }).fill('Written on a train');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet.getByText('“Written on a train” is in your Inbox.')).toBeVisible();
  await page.keyboard.press('Escape');
  await tabs(page).getByRole('link', { name: 'Tasks' }).click();
  await expect(page.getByRole('list', { name: 'To triage' }).getByText('Written on a train')).toBeVisible();
  await context.setOffline(false);
});

test('a task opens full-screen with a back link; the review hides the tab bar', async ({ page }) => {
  await page.goto('/today');
  await tabs(page).getByRole('button', { name: 'Quick capture' }).click();
  await page.getByRole('dialog', { name: 'Quick capture' }).getByRole('textbox', { name: 'New task' }).fill('Pay rent tomorrow');
  await page.getByRole('dialog', { name: 'Quick capture' }).getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('“Pay rent” is in your Inbox.')).toBeVisible();
  await page.keyboard.press('Escape');
  await tabs(page).getByRole('link', { name: 'Tasks' }).click();
  await page.getByRole('radio', { name: /^Inbox/ }).click();
  await page.getByRole('button', { name: 'Pay rent', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Task details' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Inbox' }).click();
  await expect(page.getByRole('list', { name: 'To triage' })).toBeVisible();

  await page.goto('/review');
  await expect(page.getByRole('link', { name: 'Close and finish later' })).toBeVisible();
  await expect(tabs(page)).toHaveCount(0);
});

test('Edit Home reorders by touch: press, hold, drag', async ({ page, context }) => {
  await page.goto('/home/edit');
  const grid = page.getByRole('list', { name: 'Widgets on Home' });
  const titles = () => grid.locator('li').evaluateAll((els) => els.map((el) => el.querySelector('[class*=tileTitle]')?.textContent?.trim()));
  const from = (await page.getByRole('button', { name: 'Move Vision board' }).boundingBox())!;
  const goals = (await grid.locator('li').nth(1).boundingBox())!;
  // Real touch events (Playwright's mouse would be a mouse).
  const cdp = await context.newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const sx = from.x + from.width / 2;
  const sy = from.y + from.height / 2;
  await touch('touchStart', sx, sy);
  await page.waitForTimeout(250);
  for (let i = 1; i <= 20; i++) await touch('touchMove', sx + ((goals.x + 30 - sx) * i) / 20, sy + ((goals.y + 20 - sy) * i) / 20);
  await touch('touchEnd');
  await expect.poll(async () => (await titles()).indexOf('Vision board')).toBeLessThan(3);
});
