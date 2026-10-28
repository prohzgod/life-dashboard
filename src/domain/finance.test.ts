import { addMonthsTo, budgetSentence, guessCategory, monthLabel, normalizeDescription, parseMoney, spendingTrend, summarizeMonth, trendSentence, type CategoryLike, type TxLike } from './finance';

const cats: CategoryLike[] = [
  { id: 'food', name: 'Food', kind: 'expense', budget: 50000 },
  { id: 'subs', name: 'Subscriptions', kind: 'expense', budget: 6000 },
  { id: 'other', name: 'Other', kind: 'expense', budget: null },
  { id: 'income', name: 'Income', kind: 'income', budget: null },
  { id: 'savings', name: 'Savings', kind: 'savings', budget: null },
];
const tx = (day: string, amount: number, categoryId: string | null, description = ''): TxLike => ({ day, amount, categoryId, description });

describe('parseMoney', () => {
  it('reads what people type and what banks export', () => {
    expect(parseMoney('38.40')).toBe(3840);
    expect(parseMoney('-38.4')).toBe(-3840);
    expect(parseMoney('$1,100')).toBe(110000);
    expect(parseMoney('1.234,56 €')).toBe(123456);
    expect(parseMoney('(15.99)')).toBe(-1599);
    expect(parseMoney('4 200,00')).toBe(420000);
    expect(parseMoney('20-')).toBe(-2000);
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('')).toBeNull();
  });
});

describe('months', () => {
  it('step and read naturally', () => {
    expect(addMonthsTo('2026-01', -1)).toBe('2025-12');
    expect(addMonthsTo('2026-09', 4)).toBe('2027-01');
    expect(monthLabel('2026-09')).toBe('September 2026');
    expect(monthLabel('2026-09', true)).toBe('Sep');
  });
});

describe('summarizeMonth', () => {
  const txs = [
    tx('2026-09-28', -3840, 'food'),
    tx('2026-09-25', -6800, 'subs'),
    tx('2026-09-28', 420000, 'income', 'Salary'),
    tx('2026-09-24', -60000, 'savings'),
    tx('2026-09-20', 1000, 'food'), // a refund
    tx('2026-08-30', -9900, 'food'),
  ];

  it('adds up spending, income, savings and each budget', () => {
    const s = summarizeMonth(txs, cats, '2026-09', '2026-09-29');
    expect(s).toMatchObject({ spent: 9640, budget: 56000, income: 420000, incomeSources: 1, saved: 60000, daysLeft: 2 });
    expect(s.savingsRate).toBeCloseTo(60000 / 420000);
    expect(s.categories.find((c) => c.id === 'subs')).toMatchObject({ spent: 6800, over: true, share: 1 });
    expect(s.categories.find((c) => c.id === 'food')).toMatchObject({ spent: 2840, over: false });
    expect(budgetSentence(s, (c) => `$${c / 100}`)).toBe('2 days left, $463.6 under budget');
  });

  it('closes past months and counts all days for future ones', () => {
    expect(summarizeMonth(txs, cats, '2026-08', '2026-09-29').daysLeft).toBe(0);
    expect(summarizeMonth(txs, cats, '2026-10', '2026-09-29').daysLeft).toBe(31);
  });
});

describe('spending trend', () => {
  it('compares each month with its budget and says what stands out', () => {
    const txs = [
      tx('2026-04-10', -40000, 'food'),
      tx('2026-05-10', -45000, 'food'),
      tx('2026-06-10', -42000, 'food'),
      tx('2026-07-10', -70000, 'food'),
      tx('2026-08-10', -44000, 'food'),
      tx('2026-09-10', -30000, 'food'),
    ];
    const trend = spendingTrend(txs, cats, '2026-09');
    expect(trend.map((t) => [t.month, t.spent, t.over])).toEqual([
      ['2026-04', 40000, false],
      ['2026-05', 45000, false],
      ['2026-06', 42000, false],
      ['2026-07', 70000, true],
      ['2026-08', 44000, false],
      ['2026-09', 30000, false],
    ]);
    expect(trendSentence(trend, (c) => `$${(c / 100).toLocaleString('en-US')}`)).toBe('July went over budget ($700). September is your lowest month since April.');
  });
});

describe('guessCategory', () => {
  it('learns from your past transactions, then falls back to the words', () => {
    const history = [{ description: 'CORNER SHOP 1234', categoryId: 'other' }];
    expect(guessCategory('Corner shop 9876', history, cats)).toBe('other');
    expect(guessCategory('Countdown supermarket', history, cats)).toBe('food');
    expect(guessCategory('Spotify AB', history, cats)).toBe('subs');
    expect(guessCategory('ACME PAYROLL', history, cats)).toBe('income');
    expect(guessCategory('Mystery', history, cats)).toBeNull();
    expect(normalizeDescription('AMZN Mktp 12-03 #3381')).toBe('amzn mktp');
  });
});
