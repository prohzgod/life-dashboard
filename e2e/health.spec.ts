import { expect, test } from '@playwright/test';

test('log sleep, weight and steps from the tiles', async ({ page }) => {
  await page.goto('/health');
  await expect(page.getByRole('heading', { level: 1, name: 'Health' })).toBeVisible();

  await page.getByRole('button', { name: /^Sleep · 14-night avg/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Log a reading' });
  await dialog.getByLabel(/^Value/).fill('7h 30m');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Sleep · 14-night avg 7h 30m target 7h · met 1 of 1/ })).toBeVisible();

  await page.getByRole('button', { name: /^Weight/ }).click();
  await dialog.getByLabel(/^Value/).fill('68,4');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Weight 68\.4 kg First reading/ })).toBeVisible();

  await page.getByRole('button', { name: /^Steps · daily avg/ }).click();
  await dialog.getByLabel(/^Value/).fill('8,420');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Steps · daily avg 8,420 today 8,420 so far/ })).toBeVisible();
});

test('your own metric: add it, tap to log', async ({ page }) => {
  await page.goto('/health');
  await page.getByRole('button', { name: '+ Add metric' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a metric' });
  await dialog.getByLabel('Name').fill('Water');
  await dialog.getByLabel('Unit').fill('glasses');
  await dialog.getByLabel('Daily target').fill('8');
  await dialog.getByRole('button', { name: 'Add metric' }).click();

  const row = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Edit Water' }) });
  await expect(row).toContainText('0 / 8 glasses');
  await row.getByRole('button', { name: 'Add 1 glass to Water' }).click();
  await row.getByRole('button', { name: 'Add 1 glass to Water' }).click();
  await expect(row).toContainText('2 / 8 glasses');
});

test('a run counts toward the half-marathon goal', async ({ page }) => {
  await page.goto('/health');
  await page.getByRole('button', { name: 'Add workout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add workout' });
  await dialog.getByLabel('Distance (km)').fill('5.2');
  await dialog.getByLabel('Time').fill('28:40');
  await dialog.getByLabel('Avg heart rate').fill('142');
  await expect(dialog.getByLabel(/^Counts toward “Run a half-marathon”/)).toBeChecked();
  await dialog.getByRole('button', { name: 'Add workout' }).click();

  const table = page.getByRole('table', { name: 'Recent workouts' });
  await expect(table.getByRole('row', { name: /Easy run 5\.2 km 28:40 avg 142 bpm/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Workouts · \w{3} 1 5\.2 km run/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Counts toward: Run a half-marathon' })).toBeVisible();
});
