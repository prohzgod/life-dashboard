import { expect, test, type Page } from '@playwright/test';

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const stamp = today.replaceAll('-', '');

const ics = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'X-WR-CALNAME:Work',
  'BEGIN:VEVENT',
  'UID:lunch-1',
  'SUMMARY:Lunch with Linh',
  `DTSTART:${stamp}T123000`,
  `DTEND:${stamp}T133000`,
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:standup',
  'SUMMARY:Stand-up',
  `DTSTART:${stamp}T093000`,
  `DTEND:${stamp}T094500`,
  'RRULE:FREQ=DAILY;COUNT=10',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

async function importWork(page: Page) {
  await page.getByRole('button', { name: 'Add a calendar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a calendar' });
  await dialog.getByLabel('Calendar file').setInputFiles({ name: 'work.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics) });
  await dialog.getByRole('button', { name: 'Add calendar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Added Work' })).toContainText('Added Work with 11 events');
}

test('import a .ics file: its events show read-only on the week and in Today’s agenda', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { level: 1, name: /^Week \d+$/ })).toBeVisible();
  await importWork(page);

  const grid = page.getByRole('region', { name: 'Week grid' });
  const lunch = grid.getByRole('button', { name: /^Lunch with Linh, 12:30 – 13:30, Work, read-only$/ });
  await expect(lunch).toBeVisible();
  await expect(page.locator(`[data-calendar-day="${today}"]`).getByRole('button', { name: /^Stand-up, 09:30, Work, read-only$/ })).toBeVisible();

  await lunch.click();
  const details = page.getByRole('dialog', { name: 'Lunch with Linh' });
  await expect(details).toContainText('read-only here');
  await page.keyboard.press('Escape');

  // Hiding the calendar hides its events; they come back when it's ticked again.
  // The box follows the saved setting, so click and wait rather than check()/uncheck().
  const work = page.getByRole('checkbox', { name: 'Work' });
  await work.click();
  await expect(work).not.toBeChecked();
  await expect(lunch).toHaveCount(0);
  await work.click();
  await expect(work).toBeChecked();
  await expect(lunch).toBeVisible();

  await page.goto('/today');
  const agenda = page.locator('section', { has: page.getByRole('heading', { name: 'Agenda' }) });
  await expect(agenda.getByText('Lunch with Linh')).toBeVisible();
});

test('add your own event, then edit it', async ({ page }) => {
  await page.goto('/calendar');
  await page.getByRole('button', { name: 'New event' }).click();
  const dialog = page.getByRole('dialog', { name: 'New event' });
  await dialog.getByLabel('Event').fill('Dentist');
  await dialog.getByLabel('Day', { exact: true }).fill(today);
  await dialog.getByLabel('Starts').fill('13:00');
  await dialog.getByLabel('Ends').fill('14:00');
  await dialog.getByRole('button', { name: 'Add event' }).click();

  const dentist = page.getByRole('button', { name: /^Dentist, 13:00 – 14:00, Personal$/ });
  await expect(dentist).toBeVisible();
  await dentist.click();
  const edit = page.getByRole('dialog', { name: 'Edit event' });
  await edit.getByLabel('Where').fill('High Street');
  await edit.getByRole('button', { name: 'Save' }).click();
  await dentist.click();
  await expect(page.getByRole('dialog', { name: 'Edit event' }).getByLabel('Where')).toHaveValue('High Street');
  await page.getByRole('dialog', { name: 'Edit event' }).getByRole('button', { name: 'Delete event' }).click();
  await expect(dentist).toHaveCount(0);
});

test('drag an unscheduled task onto the week to make a time block', async ({ page }) => {
  await page.goto('/today');
  const add = page.getByRole('textbox', { name: 'Add a task' });
  await add.fill('Plan Japan budget ~45m');
  await add.press('Enter');
  await expect(page.getByRole('list', { name: 'Today’s tasks' }).getByRole('button', { name: 'Plan Japan budget' })).toBeVisible();

  await page.goto('/calendar');
  const chip = page.getByRole('button', { name: /^Plan Japan budget, 45 min\. Put on the calendar$/ });
  await expect(chip).toBeVisible();
  const from = (await chip.boundingBox())!;
  const column = (await page.locator(`[data-calendar-day="${today}"]`).boundingBox())!;
  // The grid is 50px an hour; aim the chip's top at 10:00.
  const grabY = from.height / 2;
  await page.mouse.move(from.x + 20, from.y + grabY);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + grabY + 10, { steps: 4 });
  await page.mouse.move(column.x + column.width / 2, column.y + 10 * 50 + grabY, { steps: 12 });
  await page.mouse.up();

  const block = page.getByRole('button', { name: /^Plan Japan budget, 10:00 – 10:45, time block$/ });
  await expect(block).toBeVisible();

  // Clicking it gives the same controls without dragging.
  await block.click();
  const dialog = page.getByRole('dialog', { name: 'Time block' });
  await dialog.getByLabel('Starts').fill('15:00');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Plan Japan budget, 15:00 – 15:45, time block$/ })).toBeVisible();

  await page.getByRole('button', { name: /^Plan Japan budget, 15:00/ }).click();
  await page.getByRole('dialog', { name: 'Time block' }).getByRole('button', { name: 'Take off the calendar' }).click();
  await expect(chip).toBeVisible();
});

test('month and year views, and moving between weeks', async ({ page }) => {
  await page.goto('/calendar');
  const title = page.getByRole('heading', { level: 1 });
  const week = await title.textContent();
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(title).not.toHaveText(week!);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(title).toHaveText(week!);

  await page.getByRole('radiogroup', { name: 'Calendar view' }).getByRole('radio', { name: 'Month' }).click();
  await expect(page).toHaveURL(/view=month/);
  await expect(page.getByRole('region', { name: /, month$/ })).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Calendar view' }).getByRole('radio', { name: 'Year' }).click();
  await expect(page.getByRole('region', { name: /^\d{4}, year$/ })).toBeVisible();
  await page.getByRole('region', { name: /, year$/ }).getByRole('button', { name: /^1 January$/ }).click();
  await expect(page).toHaveURL(/view=day&date=\d{4}-01-01/);
});
