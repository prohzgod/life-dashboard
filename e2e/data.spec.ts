import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const countFor = (page: Page, label: string) => page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd');

test('first launch seeds once, the data survives a reload, and export → restore round-trips', async ({ page }) => {
  await page.goto('/settings/privacy');
  await expect(countFor(page, 'Goals')).toHaveText('2');
  await expect(countFor(page, 'Habits and logs')).toHaveText('3');
  await expect(countFor(page, 'Tasks')).toHaveText('1');

  // Reloading must not seed a second time.
  await page.reload();
  await expect(countFor(page, 'Goals')).toHaveText('2');
  const areas = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('life-dashboard');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const count = open.result.transaction('areas').objectStore('areas').count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
  expect(areas).toBe(8);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Everything, structured/ }).click()]);
  expect(download.suggestedFilename()).toMatch(/^life-dashboard-\d{4}-\d\d-\d\d\.json$/);
  const json = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(json.format).toBe('life-dashboard-export');
  expect(json.tables.areas).toHaveLength(8);

  await page.getByLabel('Choose an export file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
  const dialog = page.getByRole('dialog', { name: 'Replace everything on this device?' });
  await dialog.getByRole('button', { name: 'Replace everything' }).click();
  await expect(page.getByText(/Imported \d+ records from backup\.json\./)).toBeVisible();
  await expect(countFor(page, 'Goals')).toHaveText('2');
});
