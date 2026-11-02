import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const PASSWORD = 'correct horse battery';
let accounts = 0;
const newEmail = () => `person${Date.now()}${accounts++}${Math.random().toString(36).slice(2, 8)}@example.com`;

async function device(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  return { context, page: await context.newPage() };
}

async function createAccount(page: Page, email: string) {
  await page.goto('/settings/sync');
  await page.getByRole('radio', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(email)).toBeVisible();
}

async function signIn(page: Page, email: string) {
  await page.goto('/settings/sync');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(email)).toBeVisible();
}

/** Syncs and waits until nothing is left to send. */
async function syncNow(page: Page) {
  await page.goto('/settings/sync');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Synced|up to date/ })).toBeVisible();
  await expect(page.getByText(/still to sync/)).toBeHidden({ timeout: 15_000 });
}

async function addTask(page: Page, title: string) {
  await page.goto('/');
  const field = page.getByRole('textbox', { name: 'Add a task' });
  await field.fill(title);
  await field.press('Enter');
  await expect(page.getByRole('button', { name: title })).toBeVisible();
}

/** Rows in a table that aren't deleted, read straight from IndexedDB. */
function liveRows(page: Page, table: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolve) => {
        const open = indexedDB.open('life-dashboard');
        open.onsuccess = () => {
          const all = open.result.transaction(name).objectStore(name).getAll();
          all.onsuccess = () => {
            open.result.close();
            resolve((all.result as Record<string, unknown>[]).filter((row) => row.deletedAt === null));
          };
        };
      }),
    table,
  );
}

test('a task added on one device appears on the other', async ({ browser }) => {
  const a = await device(browser);
  const b = await device(browser);
  const email = newEmail();
  await createAccount(a.page, email);
  await addTask(a.page, 'Call the dentist');
  await syncNow(a.page);
  await signIn(b.page, email);
  await syncNow(b.page);
  await b.page.goto('/');
  await expect(b.page.getByRole('button', { name: 'Call the dentist' })).toBeVisible();
  // Signing in didn't add a second set of seeded areas.
  expect((await liveRows(b.page, 'areas')).length).toBe((await liveRows(a.page, 'areas')).length);
});

test('the same day checked in on both becomes one entry', async ({ browser }) => {
  const a = await device(browser);
  const b = await device(browser);
  const email = newEmail();
  await createAccount(a.page, email);
  await syncNow(a.page);
  await signIn(b.page, email);
  await syncNow(b.page);

  await b.context.setOffline(true);
  await a.page.goto('/');
  await a.page.getByRole('group', { name: 'Mood' }).getByRole('button', { name: 'Good' }).click();
  await b.page.goto('/settings/sync').catch(() => {});
  await b.context.setOffline(false);
  await b.page.goto('/');
  await b.page.getByRole('group', { name: 'Mood' }).getByRole('button', { name: 'Great' }).click();

  await syncNow(a.page);
  await syncNow(b.page);
  await syncNow(a.page);
  await syncNow(b.page);
  const onA = await liveRows(a.page, 'dailyEntries');
  const onB = await liveRows(b.page, 'dailyEntries');
  expect(onA).toHaveLength(1);
  expect(onB).toHaveLength(1);
  expect(onA[0]!.id).toBe(onB[0]!.id);
  expect(onA[0]!.mood).toBe(onB[0]!.mood);
});

test('a photo added on one shows on the other', async ({ browser }) => {
  const a = await device(browser);
  const b = await device(browser);
  const email = newEmail();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await createAccount(a.page, email);
  await a.page.goto('/');
  await a.page.getByLabel('Choose a photo of the day').setInputFiles({ name: 'day.png', mimeType: 'image/png', buffer: png });
  await expect.poll(async () => (await liveRows(a.page, 'attachments')).length).toBe(1);
  await syncNow(a.page);
  await signIn(b.page, email);
  await syncNow(b.page);
  await expect.poll(async () => (await liveRows(b.page, 'attachments')).length).toBe(1);
  await b.page.goto('/');
  await expect(b.page.getByRole('button', { name: 'Change photo of the day' })).toBeVisible();
  await expect(b.page.getByRole('button', { name: 'Change photo of the day' }).locator('img')).toHaveJSProperty('complete', true);
});

test('a device offline keeps working and catches up', async ({ browser }) => {
  const a = await device(browser);
  const b = await device(browser);
  const email = newEmail();
  await createAccount(a.page, email);
  await syncNow(a.page);
  await signIn(b.page, email);
  await syncNow(b.page);
  await a.page.goto('/');
  await a.context.setOffline(true);
  const field = a.page.getByRole('textbox', { name: 'Add a task' });
  await field.fill('Written on a plane');
  await field.press('Enter');
  await expect(a.page.getByRole('button', { name: 'Written on a plane' })).toBeVisible();
  await a.context.setOffline(false);
  await syncNow(a.page);
  await syncNow(b.page);
  await b.page.goto('/');
  await expect(b.page.getByRole('button', { name: 'Written on a plane' })).toBeVisible();
});

test('two accounts stay apart, on the same browser after switching', async ({ browser }) => {
  const { page } = await device(browser);
  const first = newEmail();
  const second = newEmail();
  await createAccount(page, first);
  await addTask(page, 'Private to the first account');
  await syncNow(page);

  await page.goto('/settings/sync');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Keep it on this device' }).click();
  await expect(page.getByLabel('Email')).toBeVisible();

  await page.getByRole('radio', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(second);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/belongs to another account/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Replace it' }).click();
  await expect(page.getByText(second)).toBeVisible();
  await syncNow(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Private to the first account' })).toBeHidden();

  // And it never reached the second account's server copy.
  const other = await device(browser);
  await signIn(other.page, second);
  await syncNow(other.page);
  await other.page.goto('/');
  await expect(other.page.getByRole('button', { name: 'Private to the first account' })).toBeHidden();
});

test("refreshing a deep link serves the app, and /api isn't caught by the service worker", async ({ page }) => {
  await page.goto('/settings/sync');
  await expect(page.getByRole('heading', { name: 'Account and sync' }).first()).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.goto('/library/does-not-matter');
  await expect(page.locator('#main')).toBeVisible();
  const health = await page.goto('/api/health');
  expect(await health!.json()).toEqual({ status: 'ok' });
});
