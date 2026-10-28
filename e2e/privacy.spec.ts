import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('encrypted backup: set a passphrase, back up, change things, restore', async ({ page }) => {
  await page.goto('/today');
  const add = page.getByRole('textbox', { name: 'Add a task' });
  await add.fill('Kept in the backup');
  await add.press('Enter');
  await expect(page.getByRole('list', { name: 'Today’s tasks' }).getByRole('button', { name: 'Kept in the backup' })).toBeVisible();

  await page.goto('/settings/privacy');
  // Backing up before encryption is set asks for a passphrase first.
  await page.getByRole('button', { name: 'Back up now' }).click();
  const setup = page.getByRole('dialog', { name: 'Encrypt your backups' });
  await setup.getByLabel('Passphrase').fill('quiet river lamp');
  await setup.getByLabel('Type it again').fill('quiet river lamp');
  await setup.getByRole('button', { name: 'Continue' }).click();
  const key = await setup.getByRole('status', { name: 'Recovery key' }).or(setup.locator('output')).textContent();
  expect(key).toMatch(/^([A-Z2-7]{4}-){7}[A-Z2-7]{4}$/);
  await expect(setup.getByRole('button', { name: 'Done' })).toBeDisabled();
  await setup.getByLabel('I’ve saved my recovery key somewhere safe').check();
  await setup.getByRole('button', { name: 'Done' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up now' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^life-dashboard-\d{4}-\d{2}-\d{2}-\d{4}\.backup\.json$/);
  const path = await file.path();
  expect(readFileSync(path, 'utf8')).not.toContain('Kept in the backup');
  await expect(page.getByText(/· verified$/)).toBeVisible();

  // Change something after the backup, then restore it with the recovery key.
  await page.goto('/today');
  await page.getByRole('checkbox', { name: 'Mark “Kept in the backup” as done' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark “Kept in the backup” as not done' })).toBeVisible();

  await page.goto('/settings/privacy');
  await page.getByRole('button', { name: 'Restore…' }).click();
  const restore = page.getByRole('dialog', { name: 'Restore from a backup' });
  await restore.getByLabel('Backup file').setInputFiles(path);
  await restore.getByLabel('Passphrase or recovery key').fill('not the passphrase');
  await restore.getByRole('button', { name: 'Open backup' }).click();
  await expect(restore.getByRole('alert')).toContainText('doesn’t open this backup');
  await restore.getByLabel('Passphrase or recovery key').fill(key!.toLowerCase());
  await restore.getByRole('button', { name: 'Open backup' }).click();
  await restore.getByRole('button', { name: 'Replace everything' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Restored' })).toContainText(/Restored \d+ records/);

  await page.goto('/today');
  await expect(page.getByRole('checkbox', { name: 'Mark “Kept in the backup” as done' })).toBeVisible();
});

test('app lock: set a passcode, lock now, unlock, and it locks again on reopening', async ({ page }) => {
  await page.goto('/settings/privacy');
  await page.getByRole('switch', { name: 'Passcode' }).click();
  const dialog = page.getByRole('dialog', { name: 'Set a passcode' });
  await dialog.getByLabel('Passcode', { exact: true }).fill('2468');
  await dialog.getByLabel('Type it again').fill('2468');
  await dialog.getByRole('button', { name: 'Turn on lock' }).click();
  await expect(page.getByRole('switch', { name: 'Passcode' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Lock app now' }).click();
  const locked = page.getByRole('heading', { name: 'Life Dashboard is locked' });
  await expect(locked).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await page.getByLabel('Passcode').fill('1357');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('That passcode isn’t right.');
  await page.getByLabel('Passcode').fill('2468');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

  await page.reload();
  await expect(locked).toBeVisible();
  await page.getByLabel('Passcode').fill('2468');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  // Turning it off needs the passcode.
  await page.getByRole('switch', { name: 'Passcode' }).click();
  const off = page.getByRole('dialog', { name: 'Turn off the app lock' });
  await off.getByLabel('Current passcode').fill('2468');
  await off.getByRole('button', { name: 'Turn off lock' }).click();
  await expect(page.getByRole('switch', { name: 'Passcode' })).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});
