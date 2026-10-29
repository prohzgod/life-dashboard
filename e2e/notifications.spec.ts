import { expect, test } from '@playwright/test';

// The browser's notifications are stubbed: permission is granted when asked, and every notice
// shown (by the page or the service worker) is recorded on window.__notices.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const notices: { title: string; body?: string }[] = [];
    (window as unknown as { __notices: typeof notices }).__notices = notices;
    // A granted permission lasts across page loads, as it does in a real browser.
    class FakeNotification {
      onclick: (() => void) | null = null;
      static get permission(): NotificationPermission {
        return sessionStorage.getItem('fake-notify') === 'granted' ? 'granted' : 'default';
      }
      static async requestPermission() {
        sessionStorage.setItem('fake-notify', 'granted');
        return 'granted';
      }
      constructor(title: string, options?: NotificationOptions) {
        notices.push({ title, body: options?.body });
      }
      close() {}
    }
    Object.defineProperty(window, 'Notification', { value: FakeNotification, configurable: true });
    if ('ServiceWorkerRegistration' in window) {
      ServiceWorkerRegistration.prototype.showNotification = async function (title: string, options?: NotificationOptions) {
        notices.push({ title, body: options?.body });
      };
    }
  });
});

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

test('turn reminders on, and a task reminder shows as a notification', async ({ page }) => {
  await page.goto('/settings/notifications');
  await expect(page.getByRole('heading', { name: 'On this device' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Task reminders' })).toBeDisabled();

  await page.getByRole('switch', { name: 'Show reminders' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Reminders' })).toHaveText('Reminders are on for this device.');
  await expect(page.getByRole('switch', { name: 'Task reminders' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Send a test notification' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __notices: { body?: string }[] }).__notices.map((n) => n.body))).toContain('Your reminders will look like this.');

  // A task whose reminder time has just passed.
  await page.goto('/');
  const add = page.getByRole('textbox', { name: 'Add a task' });
  await add.fill('Call the dentist');
  await add.press('Enter');
  await page.getByRole('list', { name: 'Today’s tasks' }).getByRole('button', { name: 'Call the dentist' }).click();
  await page.getByLabel('Reminder').fill(localInput(new Date(Date.now() - 60_000)));

  // Opening the app checks straight away.
  await page.goto('/today');
  const notices = () => page.evaluate(() => (window as unknown as { __notices: { title: string; body?: string }[] }).__notices);
  await expect.poll(notices).toContainEqual({ title: 'Reminder', body: 'Call the dentist' });

  // Shown once: coming back doesn't repeat it.
  await page.reload();
  await page.waitForTimeout(500);
  expect((await notices()).filter((n) => n.body === 'Call the dentist')).toHaveLength(0);
});
