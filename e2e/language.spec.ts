import { expect, test } from '@playwright/test';

// A first visit, with nothing saved: the app opens in Vietnamese.
test.use({ storageState: { cookies: [], origins: [] } });

test('opens in Vietnamese and switches to English', async ({ page }) => {
  await page.goto('/settings/general');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible();

  await page.getByRole('radiogroup', { name: 'Ngôn ngữ' }).getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // It stays after a reload.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});
