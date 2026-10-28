import { expect, test } from '@playwright/test';

test('goals: pace, logging progress, milestones, a new goal and the vision', async ({ page }) => {
  await page.goto('/goals');
  const tree = page.getByRole('region', { name: 'Goal tree' });
  await expect(tree.getByRole('button', { name: 'Run a half-marathon', exact: true })).toBeVisible();
  await expect(tree.getByRole('button', { name: 'Run 10 km without stopping', exact: true })).toBeVisible();

  const detail = page.getByRole('complementary', { name: 'Goal details' });
  await expect(detail.getByRole('heading', { name: 'Run a half-marathon' })).toBeVisible();
  await expect(detail.getByRole('img', { name: /progress over time against the pace line/ }).locator('svg')).toBeVisible();

  // Log a value: progress and pace update.
  await detail.getByLabel('Now', { exact: true }).fill('10.55');
  await detail.getByRole('button', { name: 'Update' }).click();
  await expect(detail.getByText('50%', { exact: true })).toBeVisible();
  await expect(tree.getByRole('progressbar', { name: 'Run a half-marathon progress' })).toHaveAttribute('aria-valuenow', '50');

  // Behind pace → a catch-up step can go on today's plan.
  const catchUp = detail.getByRole('button', { name: 'Add to plan' });
  if (await catchUp.isVisible()) {
    await catchUp.click();
    await expect(detail.getByText('Added to today’s plan.')).toBeVisible();
  }

  // A new money goal with milestones.
  await page.getByRole('button', { name: 'New goal' }).click();
  const form = page.getByRole('dialog', { name: 'New goal' });
  await form.getByLabel('Goal', { exact: true }).fill('6-month emergency fund');
  await form.getByLabel('Area', { exact: true }).selectOption({ label: 'Finance' });
  await form.getByLabel('To', { exact: true }).fill('12000');
  await form.getByLabel('Unit', { exact: true }).fill('$');
  await form.getByRole('button', { name: 'Create goal' }).click();
  await expect(detail.getByRole('heading', { name: '6-month emergency fund' })).toBeVisible();
  await expect(tree.getByText(/Year, target \$12,000/)).toBeVisible();
  await detail.getByLabel('Now', { exact: true }).fill('7400');
  await detail.getByRole('button', { name: 'Update' }).click();
  await expect(tree.getByText(/\$7,400 saved/)).toBeVisible();

  // Vision and word of the year.
  await page.getByRole('button', { name: /^Write your vision/ }).click();
  await page.getByRole('textbox', { name: 'Vision statement' }).fill('Healthy, curious, and present for the people I love.');
  await page.getByRole('textbox', { name: 'Vision statement' }).press('Enter');
  await page.getByRole('textbox', { name: 'Word of the year' }).fill('Present');
  await page.getByRole('textbox', { name: 'Word of the year' }).press('Enter');
  // A reload can drop a write still in flight, so wait until the word is stored.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string | null>((resolve) => {
            const open = indexedDB.open('life-dashboard');
            open.onsuccess = () => {
              const all = open.result.transaction('goals').objectStore('goals').getAll();
              all.onsuccess = () => {
                open.result.close();
                resolve(all.result.find((g: { horizon: string }) => g.horizon === 'vision')?.wordOfYear ?? null);
              };
            };
          }),
      ),
    )
    .toBe('Present');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Vision: Healthy, curious/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Word of the year' })).toHaveValue('Present');
});

test('progress: periods, rating the wheel of life, year in pixels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Mood' }).getByRole('button', { name: 'Good' }).click();
  await expect(page.getByRole('group', { name: 'Mood' }).getByRole('button', { name: 'Good' })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/progress');
  await expect(page.getByRole('heading', { level: 1, name: 'Progress' })).toBeVisible();
  await expect(page.getByText('Average mood')).toBeVisible();
  await expect(page.getByRole('grid', { name: /Mood for each day of \d{4}/ }).getByRole('gridcell', { name: /: Good$/ })).toHaveCount(1);

  await page.getByRole('radio', { name: 'Month' }).click();
  await expect(page.getByText(/^[A-Z][a-z]+ \d{4} so far, 1 day logged/)).toBeVisible();

  await page.getByRole('button', { name: 'Rate your areas' }).click();
  const dialog = page.getByRole('dialog', { name: 'How does each area feel right now?' });
  await dialog.getByRole('slider', { name: /Health/ }).fill('8');
  await dialog.getByRole('button', { name: 'Save ratings' }).click();
  await expect(page.getByRole('img', { name: /Wheel of life, rated .*Health 8/ }).locator('svg')).toBeVisible();
});
