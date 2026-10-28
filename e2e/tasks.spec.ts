import { expect, test } from '@playwright/test';

test('plan the day: add, check off, and it survives a reload', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('textbox', { name: 'Add a task' });
  await add.fill('Water the plants every 3 days #home ~5m');
  await expect(page.getByLabel('Will be saved as')).toContainText('Repeats every 3 days');
  await add.press('Enter');

  const list = page.getByRole('list', { name: 'Today’s tasks' });
  await expect(list.getByRole('button', { name: 'Water the plants' })).toBeVisible();
  await list.getByRole('checkbox', { name: 'Mark “Water the plants” as done' }).click();
  await expect(page.getByText('1 of 1 done')).toBeVisible();

  // The repeat's next occurrence is waiting in Upcoming.
  await page.goto('/tasks?view=upcoming');
  await expect(page.getByRole('button', { name: 'Water the plants' })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('checkbox', { name: 'Mark “Water the plants” as not done' })).toHaveAttribute('aria-checked', 'true');
});

test('⌘N captures to the Inbox from anywhere, then Accept files it', async ({ page }) => {
  await page.goto('/goals');
  await expect(page.getByRole('heading', { level: 1, name: 'Goals' })).toBeVisible();
  await page.keyboard.press('Control+n');
  const dialog = page.getByRole('dialog', { name: 'Quick capture' });
  const field = dialog.getByRole('textbox', { name: 'Capture anything' });
  await expect(field).toBeFocused();
  await field.fill('Renew car insurance before Dec 15');
  await expect(dialog.getByLabel('Will be saved as')).toContainText('Due');
  await field.press('Enter');
  await expect(dialog.getByRole('status')).toContainText('Saved “Renew car insurance” to your Inbox');
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: /^Inbox/ }).first().click();
  const triage = page.getByRole('list', { name: 'To triage' });
  await expect(triage.getByText(/Task, Finance, due/)).toBeVisible();
  await triage.getByRole('button', { name: /Accept/ }).click();
  await expect(page.getByText(/Inbox zero/)).toBeVisible();
});

test('habits and check-in save on this device', async ({ page }) => {
  await page.goto('/');
  // Each step waits for the screen to confirm the save: a reload can drop a write that's still in flight.
  await page.getByRole('checkbox', { name: 'Check in Meditate for today' }).click();
  await expect(page.getByRole('checkbox', { name: 'Undo today’s Meditate' })).toBeVisible();
  const great = page.getByRole('group', { name: 'Mood' }).getByRole('button', { name: 'Great' });
  await great.click();
  await expect(great).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: 'One line about today' }).fill('First full test run.');
  await page.getByRole('textbox', { name: 'One line about today' }).press('Enter');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            const open = indexedDB.open('life-dashboard');
            open.onsuccess = () => {
              const all = open.result.transaction('dailyEntries').objectStore('dailyEntries').getAll();
              all.onsuccess = () => {
                open.result.close();
                resolve(all.result[0]?.line ?? '');
              };
            };
          }),
      ),
    )
    .toBe('First full test run.');

  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Undo today’s Meditate' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('group', { name: 'Mood' }).getByRole('button', { name: 'Great' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'One line about today' })).toHaveValue('First full test run.');
});

test('capturing works offline', async ({ page, context }) => {
  await page.goto('/inbox');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('textbox', { name: 'Capture anything' }).fill('Written on a plane');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: 'To triage' }).getByText('Written on a plane')).toBeVisible();
  await context.setOffline(false);
});
