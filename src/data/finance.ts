import { LOCALES, messages, type Messages } from '@/i18n/locale';
import { generateKeyBetween } from 'fractional-indexing';
import { importKey, type StatementRow } from '@/domain/csv';
import type { Day } from '@/domain/days';
import { addMonthsTo, guessCategory, monthDays, monthOf, spendingTrend, summarizeMonth, type MonthSummary, type Month, type TrendMonth } from '@/domain/finance';
import { sortKeyAt } from '@/domain/library';
import { currencySymbol, defaultCurrency, formatMoney } from '@/lib/money';
import { db } from './db';
import { loadGoalBoard, logGoalValue, type GoalView } from './goalActions';
import { saveUpload, type UploadInput } from './library';
import { accountsRepo, budgetsRepo, goalsRepo, tasksRepo, transactionsRepo } from './repositories';
import type { Account, Budget, Transaction } from './types';

export class FinanceError extends Error {}

const bySortKey = <T extends { sortKey: string }>(a: T, b: T) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

const DEFAULT_BUDGETS: Array<{ key: keyof Messages['seed']['budgets']; kind: Budget['kind'] }> = [
  { key: 'housing', kind: 'expense' },
  { key: 'food', kind: 'expense' },
  { key: 'transport', kind: 'expense' },
  { key: 'fun', kind: 'expense' },
  { key: 'health', kind: 'expense' },
  { key: 'subscriptions', kind: 'expense' },
  { key: 'other', kind: 'expense' },
  { key: 'income', kind: 'income' },
  { key: 'savings', kind: 'savings' },
];

/** The usual categories, once, so the first expense has somewhere to go. Runs at startup and after an import. */
export async function ensureBudgets(): Promise<void> {
  await db.transaction('rw', db.budgets, async () => {
    if ((await budgetsRepo.list()).length) return;
    let key: string | null = null;
    for (const b of DEFAULT_BUDGETS) {
      key = generateKeyBetween(key, null);
      await budgetsRepo.create({ name: messages().seed.budgets[b.key], kind: b.kind, amount: null, sortKey: key });
    }
  });
}

export async function listBudgets(): Promise<Budget[]> {
  return (await budgetsRepo.list()).sort(bySortKey);
}

// ---- Settings (this device) ----

export type FinanceSettings = { currency: string; savingsTarget: number };
const SETTINGS_KEY = 'finance.settings';

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const stored = (await db.meta.get(SETTINGS_KEY))?.value as Partial<FinanceSettings> | undefined;
  return { currency: stored?.currency ?? defaultCurrency(), savingsTarget: stored?.savingsTarget ?? 0.25 };
}

export async function setFinanceSettings(patch: Partial<FinanceSettings>): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    await db.meta.put({ key: SETTINGS_KEY, value: { ...(await getFinanceSettings()), ...patch } });
  });
}

// ---- Budgets ----

/** Saves budgets in one go: names and monthly amounts (cents, or null for none). */
export async function saveBudgets(rows: ReadonlyArray<{ id: string; name: string; amount: number | null }>): Promise<void> {
  await db.transaction('rw', db.budgets, async () => {
    for (const r of rows) {
      const name = r.name.trim();
      if (!name) throw new FinanceError(messages().errors.finance.categoryNames);
      if (r.amount !== null && r.amount < 0) throw new FinanceError(messages().errors.finance.budgetNegative);
      await budgetsRepo.update(r.id, { name, amount: r.amount });
    }
  });
}

export async function addBudget(name: string, amount: number | null = null): Promise<Budget> {
  const clean = name.trim();
  if (!clean) throw new FinanceError(messages().errors.finance.categoryName);
  const all = await listBudgets();
  if (all.some((b) => b.name.toLowerCase() === clean.toLowerCase())) throw new FinanceError(messages().errors.finance.duplicate(clean));
  // New spending categories go before Income and Savings.
  const index = all.findIndex((b) => b.kind !== 'expense');
  return budgetsRepo.create({ name: clean, kind: 'expense', amount, sortKey: sortKeyAt(all, index < 0 ? all.length : index) });
}

/** Removes a spending category; its transactions move to Other (or stay unsorted when there's no Other). */
export async function removeBudget(id: string): Promise<void> {
  const budget = await budgetsRepo.get(id);
  if (!budget || budget.kind !== 'expense') return;
  const others = LOCALES.map((locale) => messages(locale).seed.budgets.other.toLowerCase());
  const other = (await listBudgets()).find((b) => b.kind === 'expense' && b.id !== id && others.includes(b.name.toLowerCase()));
  await db.transaction('rw', db.budgets, db.transactions, async () => {
    for (const t of await transactionsRepo.where('categoryId', id)) await transactionsRepo.update(t.id, { categoryId: other?.id ?? null });
    await budgetsRepo.remove(id);
  });
}

// ---- Transactions ----

export type TransactionInput = {
  day: Day;
  description: string;
  amount: number;
  categoryId: string | null;
  source?: Transaction['source'];
  goalId?: string | null;
  notes?: string;
  receipt?: UploadInput | null;
};

/** Money moved to a savings goal also moves the goal (in whole currency units, as goals count). */
async function moveGoal(goalId: string | null, cents: number): Promise<void> {
  if (!goalId || !cents) return;
  const goal = await goalsRepo.get(goalId);
  if (goal) await logGoalValue(goalId, Math.round(((goal.currentValue ?? goal.startValue ?? 0) + cents / 100) * 100) / 100);
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const description = input.description.trim();
  if (!description) throw new FinanceError(messages().errors.finance.description);
  if (!Number.isFinite(input.amount) || input.amount === 0) throw new FinanceError(messages().errors.finance.amount);
  const attachmentId = input.receipt ? (await saveUpload(null, { ...input.receipt, name: input.receipt.name ?? `Receipt: ${description}` })).id : null;
  const tx = await transactionsRepo.create({
    day: input.day,
    description,
    amount: input.amount,
    categoryId: input.categoryId,
    source: input.source ?? (attachmentId ? 'receipt' : input.goalId ? 'goal' : 'manual'),
    goalId: input.goalId ?? null,
    attachmentId,
    importKey: null,
    notes: input.notes?.trim() ?? '',
  });
  await moveGoal(tx.goalId, -tx.amount);
  return tx;
}

export async function updateTransaction(id: string, patch: Partial<Omit<TransactionInput, 'receipt'>>): Promise<void> {
  const current = await transactionsRepo.get(id);
  if (!current) return;
  if (patch.description !== undefined && !patch.description.trim()) throw new FinanceError(messages().errors.finance.description);
  if (patch.amount !== undefined && (!Number.isFinite(patch.amount) || patch.amount === 0)) throw new FinanceError(messages().errors.finance.amount);
  const next = await transactionsRepo.update(id, { ...patch, ...(patch.description !== undefined ? { description: patch.description.trim() } : {}) });
  // Undo the old move on the goal, then make the new one.
  if (current.goalId !== next.goalId || current.amount !== next.amount) {
    await moveGoal(current.goalId, current.amount);
    await moveGoal(next.goalId, -next.amount);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const current = await transactionsRepo.get(id);
  if (!current) return;
  await transactionsRepo.remove(id);
  await moveGoal(current.goalId, current.amount);
}

export type StatementImport = { added: number; duplicates: number; uncategorised: number };

/** Adds a statement's rows, skipping ones imported before, and sorts each by your past choices. */
export async function importTransactions(rows: readonly StatementRow[]): Promise<StatementImport> {
  return db.transaction('rw', db.transactions, db.budgets, async () => {
    const [existing, budgets] = await Promise.all([transactionsRepo.list(), listBudgets()]);
    const seen = new Set(existing.map((t) => t.importKey ?? importKey(t)));
    const cats = budgets.map((b) => ({ id: b.id, name: b.name, kind: b.kind, budget: b.amount }));
    const incomeId = budgets.find((b) => b.kind === 'income')?.id ?? null;
    let added = 0;
    let duplicates = 0;
    let uncategorised = 0;
    for (const row of rows) {
      const key = importKey(row);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      const guessed = guessCategory(row.description, existing, cats) ?? (row.amount > 0 ? incomeId : null);
      if (!guessed) uncategorised++;
      await transactionsRepo.create({ day: row.day, description: row.description, amount: row.amount, categoryId: guessed, source: 'csv', goalId: null, attachmentId: null, importKey: key, notes: '' });
      added++;
    }
    return { added, duplicates, uncategorised };
  });
}

/** The category your past transactions used for this description, else a guess from its words. */
export async function suggestCategory(description: string): Promise<string | null> {
  const [history, budgets] = await Promise.all([transactionsRepo.list(), listBudgets()]);
  return guessCategory(description, history, budgets.map((b) => ({ id: b.id, name: b.name, kind: b.kind, budget: b.amount })));
}

// ---- Accounts (net worth) ----

export async function listAccounts(): Promise<Account[]> {
  return (await accountsRepo.list()).sort(bySortKey);
}

export async function saveAccount(input: { id?: string; name: string; kind: Account['kind']; balance: number }): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new FinanceError(messages().errors.finance.account);
  if (input.balance < 0) throw new FinanceError(messages().errors.finance.balance);
  if (input.id) await accountsRepo.update(input.id, { name, kind: input.kind, balance: input.balance });
  else await accountsRepo.create({ name, kind: input.kind, balance: input.balance, sortKey: generateKeyBetween((await listAccounts()).at(-1)?.sortKey ?? null, null) });
}

export async function removeAccount(id: string): Promise<void> {
  await accountsRepo.remove(id);
}

// ---- Savings reminder ----

/** A monthly task on the 1st: "Move $600 to savings". Shows up on Today when it's due. */
export async function addSavingsReminder(cents: number, today: Day): Promise<void> {
  const { currency } = await getFinanceSettings();
  const first = monthDays(addMonthsTo(monthOf(today), today.endsWith('-01') ? 0 : 1)).first;
  await tasksRepo.create({
    areaId: null,
    goalId: null,
    keyResultId: null,
    parentTaskId: null,
    title: `Move ${formatMoney(cents, currency, { whole: true })} to savings`,
    notes: '',
    status: 'open',
    priority: null,
    doOn: first,
    time: null,
    dueAt: null,
    estimateMin: 5,
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
    reminderAt: null,
    completedAt: null,
    sortKey: 'a0',
    repeatOfId: null,
  });
}

// ---- The month view ----

export type SavingsGoal = { view: GoalView; saved: number; target: number };

export type FinanceMonth = {
  month: Month;
  currency: string;
  savingsTarget: number;
  budgets: Budget[];
  summary: MonthSummary;
  trend: TrendMonth[];
  /** This month's transactions, newest first. */
  transactions: Transaction[];
  /** Months that have any transactions, newest first, plus this one. */
  months: Month[];
  savingsGoals: SavingsGoal[];
  accounts: Account[];
  netWorth: number;
  hasReminder: boolean;
};

/** Everything the Finance screen shows for a month. Read-only, so it's safe in a live query. */
export async function loadFinanceMonth(month: Month, today: Day): Promise<FinanceMonth> {
  const [budgets, all, settings, board, accounts, tasks] = await Promise.all([listBudgets(), transactionsRepo.list(), getFinanceSettings(), loadGoalBoard(today), listAccounts(), tasksRepo.list()]);
  const cats = budgets.map((b) => ({ id: b.id, name: b.name, kind: b.kind, budget: b.amount }));
  const symbol = currencySymbol(settings.currency);
  const financeArea = board.areas.find((a) => a.name.toLowerCase() === 'finance')?.id;
  const savingsGoals = board.views
    .filter((v) => v.goal.status === 'active' && v.goal.horizon !== 'vision' && v.goal.progressMethod === 'metric' && v.goal.targetValue)
    .filter((v) => v.goal.unit === symbol || v.goal.unit?.toUpperCase() === settings.currency || (financeArea && v.goal.areaId === financeArea))
    .map((view) => ({ view, saved: Math.round((view.goal.currentValue ?? view.goal.startValue ?? 0) * 100), target: Math.round((view.goal.targetValue ?? 0) * 100) }));
  const months = [...new Set([monthOf(today), ...all.map((t) => monthOf(t.day))])].sort().reverse();
  return {
    month,
    currency: settings.currency,
    savingsTarget: settings.savingsTarget,
    budgets,
    summary: summarizeMonth(all, cats, month, today),
    trend: spendingTrend(all, cats, month, 6, today),
    transactions: all.filter((t) => monthOf(t.day) === month).sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)),
    months,
    savingsGoals,
    accounts,
    netWorth: accounts.reduce((sum, a) => sum + (a.kind === 'asset' ? a.balance : -a.balance), 0),
    hasReminder: tasks.some((t) => t.rrule?.startsWith('FREQ=MONTHLY') && /to savings$/.test(t.title) && t.status !== 'done'),
  };
}
