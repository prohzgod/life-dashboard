// @vitest-environment node
import { readStatement } from '@/domain/csv';
import { exportAll, importReplacingAll } from './backup';
import {
  addBudget,
  addSavingsReminder,
  addTransaction,
  deleteTransaction,
  ensureBudgets,
  FinanceError,
  importTransactions,
  listBudgets,
  loadFinanceMonth,
  removeBudget,
  saveAccount,
  saveBudgets,
  setFinanceSettings,
  suggestCategory,
  updateTransaction,
} from './finance';
import { createGoal } from './goalActions';
import { areasRepo, goalsRepo, tasksRepo, transactionsRepo } from './repositories';
import { freshDatabase } from './testing';

beforeEach(async () => {
  await freshDatabase();
  await setFinanceSettings({ currency: 'USD' });
});

const today = '2026-09-29';
const id = async (name: string) => (await listBudgets()).find((b) => b.name === name)!.id;

describe('budgets', () => {
  it('start with the usual categories, once', async () => {
    expect((await listBudgets()).map((b) => b.name)).toEqual(['Housing', 'Food', 'Transport', 'Fun', 'Health', 'Subscriptions', 'Other', 'Income', 'Savings']);
    await ensureBudgets();
    expect(await listBudgets()).toHaveLength(9);
  });

  it('save amounts, add before Income, and move transactions to Other on removal', async () => {
    await saveBudgets([{ id: await id('Food'), name: 'Food', amount: 50000 }]);
    const pets = await addBudget('Pets', 8000);
    expect((await listBudgets()).map((b) => b.name).slice(-4)).toEqual(['Other', 'Pets', 'Income', 'Savings']);
    await expect(addBudget('food')).rejects.toThrow('You already have “food”.');
    const t = await addTransaction({ day: today, description: 'Vet', amount: -6000, categoryId: pets.id });
    await removeBudget(pets.id);
    expect((await transactionsRepo.get(t.id))!.categoryId).toBe(await id('Other'));
  });
});

describe('transactions', () => {
  it('add up into the month, and need a description and an amount', async () => {
    await saveBudgets([
      { id: await id('Food'), name: 'Food', amount: 50000 },
      { id: await id('Subscriptions'), name: 'Subscriptions', amount: 6000 },
    ]);
    await addTransaction({ day: today, description: 'Groceries', amount: -3840, categoryId: await id('Food') });
    await addTransaction({ day: '2026-09-25', description: 'Streaming', amount: -6800, categoryId: await id('Subscriptions') });
    await addTransaction({ day: '2026-09-28', description: 'Salary', amount: 420000, categoryId: await id('Income') });
    await expect(addTransaction({ day: today, description: ' ', amount: -1, categoryId: null })).rejects.toThrow(FinanceError);
    await expect(addTransaction({ day: today, description: 'Zero', amount: 0, categoryId: null })).rejects.toThrow('Enter an amount.');

    const m = await loadFinanceMonth('2026-09', today);
    expect(m.summary).toMatchObject({ spent: 10640, budget: 56000, income: 420000, daysLeft: 2 });
    expect(m.summary.categories.find((c) => c.name === 'Subscriptions')!.over).toBe(true);
    expect(m.transactions.map((t) => t.description)).toEqual(['Groceries', 'Salary', 'Streaming']);
    expect(m.months).toContain('2026-09');
  });

  it('keeps a receipt photo with the expense', async () => {
    const t = await addTransaction({ day: today, description: 'Groceries', amount: -3840, categoryId: null, receipt: { blob: new Blob(['x'], { type: 'image/jpeg' }), thumbBlob: null, width: 10, height: 10 } });
    expect(t).toMatchObject({ source: 'receipt' });
    expect(t.attachmentId).toBeTruthy();
  });

  it('moves a savings goal when money goes to it, and back when that changes', async () => {
    const finance = (await areasRepo.list()).find((a) => a.name === 'Finance')!;
    const goal = await createGoal({ title: 'Emergency fund', why: '', areaId: finance.id, parentGoalId: null, horizon: 'year', type: 'target', progressMethod: 'metric', startValue: 0, targetValue: 12000, unit: '$', startDate: '2026-01-01', endDate: '2026-12-31', commitment: 'committed' });
    const t = await addTransaction({ day: today, description: 'To emergency fund', amount: -60000, categoryId: await id('Savings'), goalId: goal.id });
    expect((await goalsRepo.get(goal.id))!.currentValue).toBe(600);
    await updateTransaction(t.id, { amount: -50000 });
    expect((await goalsRepo.get(goal.id))!.currentValue).toBe(500);
    await deleteTransaction(t.id);
    expect((await goalsRepo.get(goal.id))!.currentValue).toBe(0);

    const m = await loadFinanceMonth('2026-09', today);
    expect(m.savingsGoals.map((s) => [s.view.goal.title, s.target])).toEqual([['Emergency fund', 1200000]]);
  });
});

describe('CSV import', () => {
  const csv = 'Date,Description,Amount\n28/09/2026,Countdown Supermarket,-38.40\n28/09/2026,ACME PAYROLL,4200.00\n27/09/2026,Mystery shop,-12.00\n';

  it('sorts rows by what they look like, and skips them the second time', async () => {
    const first = await importTransactions(readStatement(csv).rows);
    expect(first).toEqual({ added: 3, duplicates: 0, uncategorised: 1 });
    const rows = await transactionsRepo.list();
    expect(rows.find((r) => r.description === 'Countdown Supermarket')!.categoryId).toBe(await id('Food'));
    expect(rows.find((r) => r.description === 'ACME PAYROLL')!.categoryId).toBe(await id('Income'));
    expect(await importTransactions(readStatement(csv).rows)).toEqual({ added: 0, duplicates: 3, uncategorised: 0 });
  });

  it('learns from how you sorted a description before', async () => {
    await addTransaction({ day: '2026-08-01', description: 'Mystery shop', amount: -500, categoryId: await id('Fun') });
    expect(await suggestCategory('MYSTERY SHOP 42')).toBe(await id('Fun'));
    await importTransactions(readStatement(csv).rows);
    expect((await transactionsRepo.list()).find((r) => r.day === '2026-09-27')!.categoryId).toBe(await id('Fun'));
  });
});

describe('net worth and reminders', () => {
  it('adds what you own and takes away what you owe', async () => {
    await saveAccount({ name: 'Everyday', kind: 'asset', balance: 250000 });
    await saveAccount({ name: 'Car loan', kind: 'debt', balance: 90000 });
    await expect(saveAccount({ name: 'Bad', kind: 'asset', balance: -1 })).rejects.toThrow(FinanceError);
    expect((await loadFinanceMonth('2026-09', today)).netWorth).toBe(160000);
  });

  it('adds a monthly task to move money to savings', async () => {
    await addSavingsReminder(60000, today);
    const task = (await tasksRepo.list()).find((t) => t.title === 'Move $600 to savings')!;
    expect(task).toMatchObject({ doOn: '2026-10-01', rrule: 'FREQ=MONTHLY;BYMONTHDAY=1' });
    expect((await loadFinanceMonth('2026-09', today)).hasReminder).toBe(true);
  });

  it('travels in exports', async () => {
    await addTransaction({ day: today, description: 'Groceries', amount: -3840, categoryId: null });
    const file = await exportAll();
    await importReplacingAll(file);
    expect((await transactionsRepo.list()).map((t) => t.description)).toEqual(['Groceries']);
    expect(await listBudgets()).toHaveLength(9);
  });
});
