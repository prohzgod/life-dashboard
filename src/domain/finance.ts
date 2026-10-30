import { LOCALES, messages, type Messages } from '@/i18n/locale';
import { daysInMonth, makeDay, type Day } from './days';

/**
 * Money is kept in whole cents (integers), so sums never drift. Expenses are negative,
 * income positive. A month is "YYYY-MM".
 */
export type Month = string;
export type CategoryKind = 'expense' | 'income' | 'savings';

export type TxLike = { day: Day; amount: number; categoryId: string | null; description?: string };
export type CategoryLike = { id: string; name: string; kind: CategoryKind; budget: number | null };

export const monthOf = (day: Day): Month => day.slice(0, 7);

export function monthDays(month: Month): { first: Day; last: Day } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return { first: makeDay(y, m, 1), last: makeDay(y, m, daysInMonth(y, m)) };
}

export function addMonthsTo(month: Month, n: number): Month {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "September 2026" or, with short, "Sep". */
export function monthLabel(month: Month, short = false): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const name = MONTHS[m - 1]!;
  return short ? name.slice(0, 3) : `${name} ${y}`;
}

/** "12.5" or "-38.40" or "$1,100" typed by hand → cents. Null when it isn't a number. */
export function parseMoney(text: string): number | null {
  let t = text.trim().replace(/[\s\u00a0]/g, '');
  if (!t) return null;
  let negative = false;
  if (/^\(.*\)$/.test(t)) {
    negative = true;
    t = t.slice(1, -1);
  }
  if (t.startsWith('-') || t.startsWith('−')) {
    negative = !negative;
    t = t.slice(1);
  } else if (t.endsWith('-')) {
    negative = !negative;
    t = t.slice(0, -1);
  }
  t = t.replace(/^[^\d.,]+|[^\d.,]+$/g, ''); // currency symbols and codes
  if (!/^[\d.,]+$/.test(t)) return null;
  // The last separator followed by one or two digits is the decimal point; the rest group thousands.
  const decimal = /[.,](\d{1,2})$/.exec(t);
  const whole = (decimal ? t.slice(0, decimal.index) : t).replace(/[.,]/g, '');
  if (!whole && !decimal) return null;
  const cents = Number(whole || '0') * 100 + (decimal ? Number(decimal[1]!.padEnd(2, '0')) : 0);
  return negative ? -cents : cents;
}

export type CategorySpend = { id: string; name: string; spent: number; budget: number | null; over: boolean; share: number };

export type MonthSummary = {
  month: Month;
  /** Spending this month (positive cents), savings transfers and income left out. */
  spent: number;
  /** Sum of the expense budgets set. */
  budget: number;
  income: number;
  incomeSources: number;
  /** Money moved to savings (positive cents). */
  saved: number;
  /** saved ÷ income, 0–1, or null without income. */
  savingsRate: number | null;
  /** Days left in the month including today; 0 for past months. */
  daysLeft: number;
  categories: CategorySpend[];
};

/** Everything the Finance month view adds up. */
export function summarizeMonth(txs: readonly TxLike[], categories: readonly CategoryLike[], month: Month, today: Day): MonthSummary {
  const inMonth = txs.filter((t) => monthOf(t.day) === month);
  const kindOf = (id: string | null) => categories.find((c) => c.id === id)?.kind ?? null;
  const spentBy = new Map<string, number>();
  let spent = 0;
  let income = 0;
  let saved = 0;
  const sources = new Set<string>();
  for (const t of inMonth) {
    const kind = kindOf(t.categoryId);
    if (kind === 'savings') saved += -t.amount;
    else if (kind === 'income' || (kind === null && t.amount > 0)) {
      income += t.amount;
      sources.add(normalizeDescription(t.description ?? ''));
    }
    else {
      // Expenses (and refunds, which are positive amounts in an expense category).
      spent += -t.amount;
      if (t.categoryId) spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) - t.amount);
    }
  }
  const expenseCats = categories.filter((c) => c.kind === 'expense');
  const budget = expenseCats.reduce((sum, c) => sum + (c.budget ?? 0), 0);
  const { last } = monthDays(month);
  const daysLeft = today > last ? 0 : monthOf(today) === month ? Number(last.slice(8)) - Number(today.slice(8)) + 1 : Number(last.slice(8));
  return {
    month,
    spent,
    budget,
    income,
    incomeSources: sources.size,
    saved,
    savingsRate: income > 0 ? saved / income : null,
    daysLeft,
    categories: expenseCats.map((c) => {
      const s = spentBy.get(c.id) ?? 0;
      return { id: c.id, name: c.name, spent: s, budget: c.budget, over: c.budget !== null && s > c.budget, share: c.budget ? Math.min(1, s / c.budget) : 0 };
    }),
  };
}

/** "1 day left, $660 under budget", in plain words. */
export function budgetSentence(s: MonthSummary, money: (cents: number) => string): string {
  const left = s.daysLeft === 0 ? 'Month closed' : s.daysLeft === 1 ? '1 day left' : `${s.daysLeft} days left`;
  if (!s.budget) return `${left}, no budget set`;
  const diff = s.budget - s.spent;
  return `${left}, ${diff >= 0 ? `${money(diff)} under budget` : `${money(-diff)} over budget`}`;
}

export type TrendMonth = { month: Month; spent: number; budget: number; over: boolean };

/** Spending for the months up to `end`, oldest first, each against that month's budget. */
export function spendingTrend(txs: readonly TxLike[], categories: readonly CategoryLike[], end: Month, months = 6, today: Day = '9999-12-31'): TrendMonth[] {
  return Array.from({ length: months }, (_, i) => {
    const month = addMonthsTo(end, i - (months - 1));
    const s = summarizeMonth(txs, categories, month, today);
    return { month, spent: s.spent, budget: s.budget, over: s.budget > 0 && s.spent > s.budget };
  });
}

/** One plain sentence about the trend: the months over budget, and where this one stands. */
export function trendSentence(trend: readonly TrendMonth[], money: (cents: number) => string): string | null {
  const withData = trend.filter((t) => t.spent > 0);
  if (withData.length < 2) return null;
  const parts: string[] = [];
  const over = withData.filter((t) => t.over && t !== trend.at(-1));
  if (over.length === 1) parts.push(`${monthLabel(over[0]!.month).split(' ')[0]} went over budget (${money(over[0]!.spent)}).`);
  else if (over.length > 1) parts.push(`${over.length} of the last ${trend.length - 1} months went over budget.`);
  const current = trend.at(-1)!;
  const lowerThan = trend.slice(0, -1).filter((t) => t.spent > 0);
  if (current.spent > 0 && lowerThan.length && lowerThan.every((t) => t.spent > current.spent)) {
    parts.push(`${monthLabel(current.month).split(' ')[0]} is your lowest month since ${monthLabel(lowerThan[0]!.month).split(' ')[0]}.`);
  }
  return parts.join(' ') || null;
}

/** Words that point to a category, for transactions nobody has categorised before. */
const HINTS: Array<[RegExp, keyof Messages['seed']['budgets']]> = [
  [/salary|payroll|paycheck|wage|invoice paid|dividend|interest earned|lương|thưởng|cổ tức/i, 'income'],
  [/rent|mortgage|landlord|strata|council tax|property|tiền nhà|thuê nhà|tiền điện|tiền nước/i, 'housing'],
  [/grocer|supermarket|market|bakery|cafe|coffee|restaurant|food|pizza|sushi|lunch|dinner|siêu thị|chợ|cà phê|ăn|cơm|phở|bún/i, 'food'],
  [/metro|train|bus|uber|lyft|taxi|fuel|petrol|gas station|parking|toll|transit|top-up|grab|be |xăng|gửi xe|xe buýt|vé tàu/i, 'transport'],
  [/netflix|spotify|subscription|icloud|apple\.com|youtube|disney|prime|patreon|membership/i, 'subscriptions'],
  [/pharmac|doctor|dentist|clinic|hospital|gym|yoga|physio|nhà thuốc|bác sĩ|bệnh viện|phòng khám/i, 'health'],
  [/cinema|concert|ticket|game|gift|bar |pub|bowling|museum|rạp phim|quà|du lịch/i, 'fun'],
  [/savings|emergency fund|to goal|tiết kiệm/i, 'savings'],
];

/** The category your past transactions with the same description used, else a guess from its words. */
export function guessCategory(description: string, history: ReadonlyArray<{ description: string; categoryId: string | null }>, categories: readonly CategoryLike[]): string | null {
  const key = normalizeDescription(description);
  const past = [...history].reverse().find((h) => h.categoryId && normalizeDescription(h.description) === key);
  if (past) return past.categoryId;
  for (const [pattern, key] of HINTS) {
    if (!pattern.test(description)) continue;
    // The starter categories are named in the language they were made in; match either.
    const names = LOCALES.map((locale) => messages(locale).seed.budgets[key].toLowerCase());
    return categories.find((c) => names.includes(c.name.toLowerCase()))?.id ?? null;
  }
  return null;
}

/** "AMZN Mktp 12-03 #3381" and "amzn mktp" match: lower case, no digits or punctuation. */
export function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\d#*.,:;/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
