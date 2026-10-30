import { expect, test } from '@playwright/test';

test('a monthly review from the Reviews page: look back, reflect, plan, finish into the journal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'More screens' }).click();
  await page.getByRole('menuitem', { name: /Reviews/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Reviews' })).toBeVisible();
  const slots = page.getByRole('list', { name: 'Your reviews' });
  for (const kind of ['Weekly review', 'Monthly review', 'Quarterly review', 'Yearly review']) await expect(slots.getByRole('heading', { name: kind })).toBeVisible();

  await slots.getByRole('link', { name: /^Start monthly review/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Monthly review' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your month at a glance' })).toBeVisible();
  await page.getByRole('button', { name: 'Insert into review' }).click();

  await page.getByRole('button', { name: 'Next: reflect' }).click();
  await page.getByRole('textbox', { name: 'What went well this month?' }).fill('Three long runs, and a calm week off.');
  await page.getByRole('button', { name: /^Next: plan/ }).click();

  await page.getByRole('textbox', { name: 'Your own focus item' }).fill('Finish the garden plan');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: /^Set goals for/ }).click();
  await expect(page.getByText(/^Saved\. These are your goals for/)).toBeVisible();

  // Leave and come back: the review remembers where you were.
  await page.getByRole('button', { name: 'Save and finish later' }).click();
  await expect(slots.getByRole('link', { name: /^Continue monthly review/ })).toBeVisible();
  await slots.getByRole('link', { name: /^Continue monthly review/ }).click();
  await expect(page.getByRole('textbox', { name: 'Your own focus item' })).toBeVisible();

  await page.getByRole('button', { name: 'Next: wrap up' }).click();
  await expect(page.getByText('Three long runs, and a calm week off.')).toBeVisible();
  await page.getByRole('button', { name: 'Finish review' }).click();
  await expect(page.getByRole('heading', { name: 'Review saved' })).toBeVisible();

  await page.getByRole('link', { name: 'Open journal page' }).click();
  const journal = page.locator('.bn-editor');
  await expect(journal).toContainText(/Monthly review, /);
  await expect(journal).toContainText('Finish the garden plan');

  await page.goto('/reviews');
  await expect(page.getByRole('region', { name: 'Finished reviews' }).or(page.locator('section', { has: page.getByRole('heading', { name: 'Finished reviews' }) }))).toContainText('Monthly review');
});

test('a quarterly review asks about your life areas', async ({ page }) => {
  await page.goto('/review/quarter');
  await expect(page.getByRole('heading', { level: 1, name: 'Quarterly review' })).toBeVisible();
  await page.getByRole('button', { name: 'Next: reflect' }).click();
  await expect(page.getByRole('textbox', { name: 'Your biggest wins this quarter' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wheel of life' })).toBeVisible();
});
