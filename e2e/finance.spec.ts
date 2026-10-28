import { expect, test, type Page } from '@playwright/test';

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const dmy = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

async function addExpense(page: Page, amount: string, what: string, category: string) {
  await page.getByRole('button', { name: 'Add expense' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add expense' });
  await dialog.getByLabel(/^Amount/).fill(amount);
  await dialog.getByLabel('What for').fill(what);
  await dialog.getByLabel('Category').selectOption({ label: category });
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test('budgets, expenses and going over, in plain numbers', async ({ page }) => {
  await page.goto('/finance');
  await expect(page.getByRole('heading', { level: 1, name: 'Finance' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit budgets' }).click();
  const budgets = page.getByRole('dialog', { name: 'Edit budgets' });
  await budgets.getByLabel('Currency').selectOption('USD');
  await budgets.getByLabel('Monthly budget for Food').fill('500');
  await budgets.getByLabel('Monthly budget for Subscriptions').fill('60');
  await budgets.getByRole('button', { name: 'Save budgets' }).click();

  await addExpense(page, '38.40', 'Groceries', 'Food');
  await addExpense(page, '68', 'Streaming subscription', 'Subscriptions');

  const table = page.getByRole('table');
  await expect(table.getByRole('row', { name: /Groceries Food Manual −\$38\.40/ })).toBeVisible();
  const spent = page.getByRole('region', { name: 'Spent this month' });
  await expect(spent).toContainText('$106');
  await expect(spent).toContainText('of $560');
  await expect(spent).toContainText('$454 under budget');
  await expect(page.getByRole('region', { name: 'Budget by category' }).or(page.locator('section', { has: page.getByRole('heading', { name: 'Budget by category' }) }))).toContainText('$68 / $60, over');

  // Edit a transaction from the table.
  await table.getByRole('button', { name: 'Groceries' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit transaction' });
  await edit.getByLabel(/^Amount/).fill('40');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(spent).toContainText('$108');

  // Hide amounts everywhere at once.
  await page.getByRole('button', { name: 'Hide amounts' }).click();
  await expect(spent).toContainText('••••••');
  await expect(table).not.toContainText('$40.00');
  await page.getByRole('button', { name: 'Show amounts' }).click();
});

test('import a bank CSV once; the second time skips what is already there', async ({ page }) => {
  await page.goto('/finance');
  const csv = `Date,Description,Amount\n${dmy},Countdown Supermarket,-38.40\n${dmy},ACME PAYROLL,4200.00\n${dmy},Metro card top-up,-20.00\n`;
  const importIt = async () => {
    await page.getByRole('button', { name: 'Import CSV' }).click();
    const dialog = page.getByRole('dialog', { name: 'Import a bank CSV' });
    await dialog.getByLabel('CSV file').setInputFiles({ name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await expect(dialog.getByRole('status')).toContainText('3 transactions');
    await dialog.getByRole('button', { name: 'Import' }).click();
  };
  await importIt();
  await expect(page.getByRole('status').filter({ hasText: 'Imported' })).toContainText('Imported 3 transactions.');
  const table = page.getByRole('table');
  await expect(table.getByRole('row', { name: /Countdown Supermarket Food CSV import/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Metro card top-up Transport/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Income' })).toContainText(/4,200/);

  await importIt();
  await expect(page.getByRole('status').filter({ hasText: 'Imported' })).toContainText('Imported 0 transactions, skipped 3 already here.');
  await expect(table.getByRole('row')).toHaveCount(4); // header + 3
});

test('net worth stays hidden until you reveal it', async ({ page }) => {
  await page.goto('/finance');
  const worth = page.getByRole('region', { name: 'Net worth' });
  await worth.getByRole('button', { name: 'Add accounts to see it' }).click();
  const dialog = page.getByRole('dialog', { name: 'Accounts and net worth' });
  await dialog.getByLabel('Account').fill('Everyday');
  await dialog.getByLabel('Balance').fill('2500');
  await dialog.getByRole('button', { name: 'Add account' }).click();
  await dialog.getByLabel('Account').fill('Car loan');
  await dialog.getByLabel('Kind').selectOption({ label: 'I owe' });
  await dialog.getByLabel('Balance').fill('900');
  await dialog.getByRole('button', { name: 'Add account' }).click();
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(worth).toContainText('••••••');
  await worth.getByRole('button', { name: 'Hidden by default, reveal' }).click();
  await expect(worth).toContainText('1,600');
  expect(today).toMatch(/^\d{4}-/);
});
