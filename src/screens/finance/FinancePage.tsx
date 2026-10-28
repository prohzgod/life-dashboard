import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { budgetSentence, monthLabel, monthOf, trendSentence, type CategorySpend } from '@/domain/finance';
import { addSavingsReminder, getPrivacyState, loadFinanceMonth, type SavingsGoal, type Transaction } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { formatDayShort } from '@/lib/format';
import { formatMoney, HIDDEN_MONEY } from '@/lib/money';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { AccountsDialog, BudgetsDialog, ImportDialog, TransactionDialog } from './FinanceDialogs';
import styles from './Finance.module.css';

type Open = { kind: 'tx'; transaction?: Transaction } | { kind: 'import' } | { kind: 'budgets' } | { kind: 'accounts' } | null;

const SOURCE: Record<Transaction['source'], string> = { manual: 'Manual', receipt: 'Receipt photo', csv: 'CSV import', recurring: 'Recurring', goal: 'Linked to goal' };

/** /finance: the month's spending against budget, income, savings, net worth (hidden), goals and transactions. */
export function FinancePage() {
  const today = useToday();
  const phone = useIsMobile();
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month')! : monthOf(today);
  const data = useLiveQuery(() => loadFinanceMonth(month, today), [month, today]);
  const hideByDefault = useLiveQuery(async () => (await getPrivacyState()).lock.hideMoney);
  const [hiddenChoice, setHidden] = useState<boolean | null>(null);
  const [revealWorth, setRevealWorth] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const [message, setMessage] = useState('');
  const hidden = hiddenChoice ?? hideByDefault ?? false;

  if (!data) return null;
  const money = (cents: number, opts: { signed?: boolean; whole?: boolean } = {}) => (hidden ? HIDDEN_MONEY : formatMoney(cents, data.currency, opts));
  const whole = (cents: number) => money(cents, { whole: true });
  const setMonth = (m: string) => {
    const next = new URLSearchParams(params);
    if (m === monthOf(today)) next.delete('month');
    else next.set('month', m);
    setParams(next, { replace: true });
  };

  const dialogs = (
    <>
      <TransactionDialog
        open={open?.kind === 'tx'}
        onClose={() => setOpen(null)}
        transaction={open?.kind === 'tx' ? open.transaction : undefined}
        budgets={data.budgets}
        goals={data.savingsGoals}
        today={today}
        currency={data.currency}
        onSaved={setMessage}
      />
      <ImportDialog open={open?.kind === 'import'} onClose={() => setOpen(null)} onDone={setMessage} />
      <BudgetsDialog open={open?.kind === 'budgets'} onClose={() => setOpen(null)} budgets={data.budgets} currency={data.currency} savingsTarget={data.savingsTarget} />
      <AccountsDialog open={open?.kind === 'accounts'} onClose={() => setOpen(null)} accounts={data.accounts} currency={data.currency} />
      {message && <Toast onDone={() => setMessage('')}>{message}</Toast>}
    </>
  );

  const s = data.summary;
  const spentShare = s.budget ? Math.min(1, s.spent / s.budget) : 0;
  const categoryName = (id: string | null) => data.budgets.find((b) => b.id === id)?.name ?? 'Not sorted';
  const eye = (
    <button type="button" className={phone ? styles.roundButton : styles.headerButton} aria-pressed={hidden} aria-label={phone ? 'Hide amounts' : undefined} onClick={() => setHidden(!hidden)}>
      <Icon name={hidden ? 'eyeOff' : 'eye'} size={16} />
      {!phone && (hidden ? 'Show amounts' : 'Hide amounts')}
    </button>
  );
  const worth = (
    <NetWorth
      hasAccounts={data.accounts.length > 0}
      revealed={revealWorth && !hidden}
      value={whole(data.netWorth)}
      short={phone}
      onReveal={() => setRevealWorth(!revealWorth)}
      onAccounts={() => setOpen({ kind: 'accounts' })}
    />
  );

  if (phone) {
    const withBudget = s.categories.filter((c) => c.budget || c.spent).sort((a, b) => Number(b.over) - Number(a.over) || b.spent - a.spent);
    return (
      <div className={styles.phone}>
        <header className={styles.phoneHeader}>
          <Link to="/" className={styles.phoneBack} aria-label="Back to Home">
            <Icon name="chevronLeft" size={18} />
            Home
          </Link>
          <h1 className={styles.phoneTitle}>Finance</h1>
          {eye}
        </header>
        <section className={cx(styles.card, styles.phoneHero)} aria-label="Spent this month">
          <span className={styles.statLabel}>Spent in {monthLabel(month).split(' ')[0]}</span>
          <span className={styles.heroAmount}>
            {whole(s.spent)} {s.budget > 0 && <span className={styles.ofBudget}>of {whole(s.budget)}</span>}
          </span>
          <Track share={spentShare} over={s.budget > 0 && s.spent > s.budget} pace={paceShare(month, today)} />
          <span className={cx(styles.heroNote, s.budget > 0 && s.spent > s.budget ? styles.bad : styles.good)}>{hidden ? 'Amounts hidden' : budgetSentence(s, (c) => formatMoney(c, data.currency, { whole: true }))}</span>
        </section>
        <div className={styles.phoneTiles}>
          <section className={styles.card} aria-label="Saved">
            <span className={styles.statLabel}>Saved</span>
            <span className={styles.tileAmount}>{whole(s.saved)}</span>
            <span className={styles.statNote}>{s.savingsRate === null ? 'No income yet' : `${Math.round(s.savingsRate * 100)}% savings rate`}</span>
          </section>
          <section className={styles.card} aria-label="Net worth">
            <span className={styles.statLabel}>Net worth</span>
            {worth}
          </section>
        </div>
        <section className={styles.card} aria-labelledby="phone-budgets">
          <div className={styles.cardHead}>
            <h2 id="phone-budgets" className={styles.cardTitle}>
              Budgets
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'budgets' })}>
              Edit
            </button>
          </div>
          {withBudget.length === 0 && <p className={styles.quiet}>Set a monthly amount for a few categories to see them here.</p>}
          <ul className={styles.phoneBudgets}>
            {withBudget.slice(0, 4).map((c) => (
              <li key={c.id}>
                <span className={styles.phoneBudgetHead}>
                  <span className={c.over ? styles.strong : undefined}>{c.name}</span>
                  <BudgetFigure c={c} money={whole} />
                </span>
                <Track share={c.share} over={c.over} />
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.card} aria-labelledby="phone-recent">
          <div className={styles.cardHead}>
            <h2 id="phone-recent" className={styles.cardTitle}>
              Recent
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'tx' })}>
              Add expense
            </button>
          </div>
          {data.transactions.length === 0 && <p className={styles.quiet}>Nothing this month yet. Add an expense, or import a CSV on a computer.</p>}
          <ul className={styles.phoneTx}>
            {data.transactions.slice(0, 6).map((t) => (
              <li key={t.id}>
                <button type="button" className={styles.phoneTxRow} onClick={() => setOpen({ kind: 'tx', transaction: t })}>
                  <span className={styles.phoneTxText}>
                    <span className={styles.strong}>{t.description}</span>
                    <span className={styles.statNote}>
                      {formatDayShort(t.day).slice(4)}, {SOURCE[t.source]}
                    </span>
                  </span>
                  <span className={cx(styles.amount, t.amount > 0 && styles.income)}>{money(t.amount, { signed: true, whole: Math.abs(t.amount) >= 100000 })}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {dialogs}
      </div>
    );
  }

  const trendNote = hidden ? null : trendSentence(data.trend, (c) => formatMoney(c, data.currency, { whole: true }));
  const trendMax = Math.max(1, ...data.trend.map((t) => Math.max(t.spent, t.budget)));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Finance</h1>
            <span className={styles.moduleChip}>Optional module</span>
          </div>
          <span className={styles.privacyNote}>
            <Icon name="lock" size={13} />
            Only on this device. No bank logins, ever.
          </span>
        </div>
        <div className={styles.actions}>
          <label className="visually-hidden" htmlFor="finance-month">
            Month
          </label>
          <select id="finance-month" className={styles.monthSelect} value={month} onChange={(e) => setMonth(e.target.value)}>
            {[...new Set([month, ...data.months])]
              .sort()
              .reverse()
              .map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
          </select>
          {eye}
          <button type="button" className={styles.headerButton} onClick={() => setOpen({ kind: 'import' })}>
            Import CSV
          </button>
          <Button variant="primary" onClick={() => setOpen({ kind: 'tx' })}>
            Add expense
          </Button>
        </div>
      </header>

      <div className={styles.stats}>
        <Stat label="Spent this month" amount={whole(s.spent)} of={s.budget > 0 ? whole(s.budget) : null}>
          <Track share={spentShare} over={s.budget > 0 && s.spent > s.budget} />
          <span className={styles.statNote}>{hidden ? 'Amounts hidden' : budgetSentence(s, (c) => formatMoney(c, data.currency, { whole: true }))}</span>
        </Stat>
        <Stat label="Income" amount={whole(s.income)}>
          <span className={styles.statNote}>{s.incomeSources ? `${s.incomeSources} ${s.incomeSources === 1 ? 'source' : 'sources'}` : 'None this month'}</span>
        </Stat>
        <Stat label="Saved" amount={whole(s.saved)}>
          <span className={styles.statNote}>
            {s.savingsRate === null ? `Goal ${Math.round(data.savingsTarget * 100)}% of income` : `${Math.round(s.savingsRate * 100)}% savings rate, goal ${Math.round(data.savingsTarget * 100)}%${s.savingsRate >= data.savingsTarget ? ', reached' : ''}`}
          </span>
        </Stat>
        <section className={styles.stat} aria-label="Net worth">
          <span className={styles.statLabel}>Net worth</span>
          {worth}
        </section>
      </div>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="budget-title">
          <div className={styles.cardHead}>
            <h2 id="budget-title" className={styles.cardTitle}>
              Budget by category
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'budgets' })}>
              Edit budgets
            </button>
          </div>
          <ul className={styles.budgets}>
            {s.categories.map((c) => (
              <li key={c.id} className={c.over ? styles.overRow : undefined}>
                <span className={styles.budgetName}>{c.name}</span>
                <Track share={c.budget ? c.share : 0} over={c.over} full={c.budget !== null && c.share >= 1 && !c.over} />
                <BudgetFigure c={c} money={whole} />
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card} aria-labelledby="savings-title">
          <div className={styles.cardHead}>
            <h2 id="savings-title" className={styles.cardTitle}>
              Savings goals
            </h2>
            <Link to="/goals" className={styles.textLink}>
              Linked to Goals
            </Link>
          </div>
          {data.savingsGoals.length === 0 && <p className={styles.quiet}>Give a goal a money target in Goals (for example, an emergency fund of $12,000) and it shows here.</p>}
          {data.savingsGoals.map((g) => (
            <SavingsRow key={g.view.goal.id} goal={g} money={whole} hidden={hidden} />
          ))}
          <ReminderBox
            has={data.hasReminder}
            onAdd={async () => {
              // The savings goal's share of this month's income, in round hundreds; $100 without income yet.
              const suggested = Math.round((s.income * data.savingsTarget) / 10000) * 10000 || 10000;
              await addSavingsReminder(suggested, today);
              setMessage('Added a monthly task for the 1st. It shows up on Today.');
            }}
          />
        </section>
      </div>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="tx-title">
          <div className={styles.cardHead}>
            <h2 id="tx-title" className={styles.cardTitle}>
              {month === monthOf(today) ? 'Recent transactions' : `Transactions in ${monthLabel(month).split(' ')[0]}`}
            </h2>
            <span className={styles.quiet}>manual, receipt photos or bank CSV</span>
          </div>
          {data.transactions.length === 0 ? (
            <p className={styles.quiet}>Nothing here for {monthLabel(month)} yet. Add an expense, or import your bank’s CSV.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Description</th>
                    <th scope="col">Category</th>
                    <th scope="col">Source</th>
                    <th scope="col" className={styles.right}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{formatDayShort(t.day).slice(4)}</td>
                      <td>
                        <button type="button" className={styles.rowButton} onClick={() => setOpen({ kind: 'tx', transaction: t })}>
                          {t.description}
                        </button>
                      </td>
                      <td className={!t.categoryId ? styles.unsorted : undefined}>{categoryName(t.categoryId)}</td>
                      <td>{SOURCE[t.source]}</td>
                      <td className={cx(styles.right, styles.amount, t.amount > 0 && styles.strong)}>{money(t.amount, { signed: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.card} aria-labelledby="trend-title">
          <div className={styles.cardHead}>
            <h2 id="trend-title" className={styles.cardTitle}>
              Spending, last 6 months
            </h2>
            <span className={styles.quiet}>dashed = budget</span>
          </div>
          <ol className={styles.trend} aria-label="Spending by month">
            {data.trend.map((t) => (
              <li key={t.month} className={styles.trendMonth}>
                <span className={styles.trendBars}>
                  {t.budget > 0 && <span className={styles.trendBudget} style={{ bottom: `${(t.budget / trendMax) * 100}%` }} aria-hidden="true" />}
                  <span
                    className={cx(styles.trendBar, t.over && styles.trendOver, t.month === month && !t.over && styles.trendNow)}
                    style={{ height: `${(t.spent / trendMax) * 100}%` }}
                    aria-hidden="true"
                  />
                </span>
                <span className={cx(styles.trendLabel, t.month === month && styles.strong)}>{monthLabel(t.month, true)}</span>
                <span className="visually-hidden">
                  {monthLabel(t.month)}: {whole(t.spent)} spent{t.budget ? ` of ${whole(t.budget)}` : ''}
                  {t.over ? ', over budget' : ''}
                </span>
              </li>
            ))}
          </ol>
          {trendNote && <p className={styles.statNote}>{trendNote}</p>}
        </section>
      </div>
      {dialogs}
    </div>
  );
}

/** How far through the month today is, 0–1, for the "where you should be" tick. */
function paceShare(month: string, today: string): number | undefined {
  if (monthOf(today) !== month) return undefined;
  const day = Number(today.slice(8));
  const [y, m] = month.split('-').map(Number) as [number, number];
  return day / new Date(y, m, 0).getDate();
}

function Stat({ label, amount, of, children }: { label: string; amount: string; of?: string | null; children: ReactNode }) {
  return (
    <section className={styles.stat} aria-label={label}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statAmount}>
        {amount} {of && <span className={styles.ofBudget}>of {of}</span>}
      </span>
      {children}
    </section>
  );
}

function Track({ share, over = false, full = false, pace }: { share: number; over?: boolean; full?: boolean; pace?: number }) {
  return (
    <span className={styles.track} aria-hidden="true">
      <span className={cx(styles.fill, over && styles.fillOver, full && styles.fillFull)} style={{ width: `${Math.round(Math.min(1, share) * 100)}%` }} />
      {pace !== undefined && <span className={styles.paceTick} style={{ left: `${pace * 100}%` } as CSSProperties} />}
    </span>
  );
}

function BudgetFigure({ c, money }: { c: CategorySpend; money: (cents: number) => string }) {
  return (
    <span className={cx(styles.budgetFigure, c.over && styles.overFigure)}>
      {money(c.spent)}
      {c.budget !== null ? ` / ${money(c.budget)}` : ''}
      {c.over ? ', over' : c.budget === null ? ', no limit' : ''}
    </span>
  );
}

function SavingsRow({ goal, money, hidden }: { goal: SavingsGoal; money: (cents: number) => string; hidden: boolean }) {
  const { view, saved, target } = goal;
  const percent = Math.round(view.progress.percent ?? 0);
  return (
    <div className={styles.goal}>
      <span className={styles.goalHead}>
        <Link to={`/goals/${view.goal.id}`} className={styles.goalTitle}>
          {view.goal.title}
        </Link>
        <span>{percent}%</span>
      </span>
      <Track share={percent / 100} pace={view.pace.expected !== null && view.pace.expected !== undefined ? view.pace.expected / 100 : undefined} />
      <span className={styles.statNote}>
        {money(saved)} of {money(target)}
        {!hidden && view.pace.sentence ? (
          <>
            {', '}
            <span className={view.pace.state === 'behind' ? styles.warn : undefined}>{view.pace.sentence}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

function ReminderBox({ has, onAdd }: { has: boolean; onAdd: () => void }) {
  return (
    <div className={styles.reminder}>
      {has ? (
        'A monthly task on the 1st reminds you to move money to savings. It shows up on Today.'
      ) : (
        <>
          Paying yourself first works best on a schedule.{' '}
          <button type="button" className={styles.inlineButton} onClick={onAdd}>
            Remind me on the 1st of each month
          </button>
        </>
      )}
    </div>
  );
}

function NetWorth({ hasAccounts, revealed, value, short = false, onReveal, onAccounts }: { hasAccounts: boolean; revealed: boolean; value: string; short?: boolean; onReveal: () => void; onAccounts: () => void }) {
  if (!hasAccounts) {
    return (
      <>
        <span className={styles.worthHidden} aria-hidden="true">
          {HIDDEN_MONEY}
        </span>
        <button type="button" className={styles.textButton} onClick={onAccounts}>
          {short ? 'Add accounts' : 'Add accounts to see it'}
        </button>
      </>
    );
  }
  return (
    <>
      {revealed ? <span className={styles.statAmount}>{value}</span> : <span className={styles.worthHidden}>{HIDDEN_MONEY}</span>}
      <span className={styles.worthActions}>
        <button type="button" className={styles.textButton} aria-pressed={revealed} onClick={onReveal}>
          {revealed ? 'Hide' : short ? 'Reveal' : 'Hidden by default, reveal'}
        </button>
        <button type="button" className={styles.textButton} onClick={onAccounts}>
          Accounts
        </button>
      </span>
    </>
  );
}

