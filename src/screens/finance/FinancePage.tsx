import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { budgetSentence, monthLabel, monthName, monthOf, trendSentence, type CategorySpend } from '@/domain/finance';
import { addSavingsReminder, getPrivacyState, loadFinanceMonth, type SavingsGoal, type Transaction } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { AnimatedNumber, Button } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { formatDayMonth } from '@/lib/format';
import { formatMoney, HIDDEN_MONEY } from '@/lib/money';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { AccountsDialog, BudgetsDialog, ImportDialog, TransactionDialog } from './FinanceDialogs';
import { useT } from '@/i18n';
import styles from './Finance.module.css';

type Open = { kind: 'tx'; transaction?: Transaction } | { kind: 'import' } | { kind: 'budgets' } | { kind: 'accounts' } | null;

/** /finance: the month's spending against budget, income, savings, net worth (hidden), goals and transactions. */
export function FinancePage() {
  const t = useT().finance;
  const SOURCE = t.sources;
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
  const categoryName = (id: string | null) => data.budgets.find((b) => b.id === id)?.name ?? t.notSorted;
  const eye = (
    <button type="button" className={phone ? styles.roundButton : styles.headerButton} aria-pressed={hidden} aria-label={phone ? t.hideAmounts : undefined} onClick={() => setHidden(!hidden)}>
      <Icon name={hidden ? 'eyeOff' : 'eye'} size={16} />
      {!phone && (hidden ? t.showAmounts : t.hideAmounts)}
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
          <Link to="/" className={styles.phoneBack} aria-label={t.backHome}>
            <Icon name="chevronLeft" size={18} />
            {t.home}
          </Link>
          <h1 className={styles.phoneTitle}>{t.title}</h1>
          {eye}
        </header>
        <section className={cx(styles.card, styles.phoneHero)} aria-label={t.spentThisMonth}>
          <span className={styles.statLabel}>{t.spentIn(monthName(month))}</span>
          <span className={styles.heroAmount}>
            <AnimatedNumber value={s.spent} format={whole} /> {s.budget > 0 && <span className={styles.ofBudget}>{t.of(whole(s.budget))}</span>}
          </span>
          <Track share={spentShare} over={s.budget > 0 && s.spent > s.budget} pace={paceShare(month, today)} />
          <span className={cx(styles.heroNote, s.budget > 0 && s.spent > s.budget ? styles.bad : styles.good)}>{hidden ? t.amountsHidden : budgetSentence(s, (c) => formatMoney(c, data.currency, { whole: true }))}</span>
        </section>
        <div className={styles.phoneTiles}>
          <section className={styles.card} aria-label={t.saved}>
            <span className={styles.statLabel}>{t.saved}</span>
            <span className={styles.tileAmount}>{whole(s.saved)}</span>
            <span className={styles.statNote}>{s.savingsRate === null ? t.noIncome : t.savingsRate(Math.round(s.savingsRate * 100))}</span>
          </section>
          <section className={styles.card} aria-label={t.netWorth}>
            <span className={styles.statLabel}>{t.netWorth}</span>
            {worth}
          </section>
        </div>
        <section className={styles.card} aria-labelledby="phone-budgets">
          <div className={styles.cardHead}>
            <h2 id="phone-budgets" className={styles.cardTitle}>
              {t.budgets}
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'budgets' })}>
              {t.edit}
            </button>
          </div>
          {withBudget.length === 0 && <p className={styles.quiet}>{t.budgetsEmpty}</p>}
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
              {t.recent}
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'tx' })}>
              {t.addExpense}
            </button>
          </div>
          {data.transactions.length === 0 && <p className={styles.quiet}>{t.recentEmpty}</p>}
          <ul className={styles.phoneTx}>
            {data.transactions.slice(0, 6).map((tx) => (
              <li key={tx.id}>
                <button type="button" className={styles.phoneTxRow} onClick={() => setOpen({ kind: 'tx', transaction: tx })}>
                  <span className={styles.phoneTxText}>
                    <span className={styles.strong}>{tx.description}</span>
                    <span className={styles.statNote}>
                      {formatDayMonth(tx.day)}, {SOURCE[tx.source]}
                    </span>
                  </span>
                  <span className={cx(styles.amount, tx.amount > 0 && styles.income)}>{money(tx.amount, { signed: true, whole: Math.abs(tx.amount) >= 100000 })}</span>
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
            <h1 className={styles.title}>{t.title}</h1>
            <span className={styles.moduleChip}>{t.module}</span>
          </div>
          <span className={styles.privacyNote}>
            <Icon name="lock" size={13} />
            {t.privacy}
          </span>
        </div>
        <div className={styles.actions}>
          <label className="visually-hidden" htmlFor="finance-month">
            {t.month}
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
            {t.importCsv}
          </button>
          <Button variant="primary" onClick={() => setOpen({ kind: 'tx' })}>
            {t.addExpense}
          </Button>
        </div>
      </header>

      <div className={styles.stats}>
        <Stat label={t.spentThisMonth} amount={<AnimatedNumber value={s.spent} format={whole} />} of={s.budget > 0 ? whole(s.budget) : null}>
          <Track share={spentShare} over={s.budget > 0 && s.spent > s.budget} />
          <span className={styles.statNote}>{hidden ? t.amountsHidden : budgetSentence(s, (c) => formatMoney(c, data.currency, { whole: true }))}</span>
        </Stat>
        <Stat label={t.income} amount={<AnimatedNumber value={s.income} format={whole} />}>
          <span className={styles.statNote}>{s.incomeSources ? t.incomeSources(s.incomeSources) : t.noIncomeMonth}</span>
        </Stat>
        <Stat label={t.saved} amount={<AnimatedNumber value={s.saved} format={whole} />}>
          <span className={styles.statNote}>
            {s.savingsRate === null ? t.savingsGoalOnly(Math.round(data.savingsTarget * 100)) : t.savingsGoal(Math.round(s.savingsRate * 100), Math.round(data.savingsTarget * 100), s.savingsRate >= data.savingsTarget)}
          </span>
        </Stat>
        <section className={styles.stat} aria-label={t.netWorth}>
          <span className={styles.statLabel}>{t.netWorth}</span>
          {worth}
        </section>
      </div>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="budget-title">
          <div className={styles.cardHead}>
            <h2 id="budget-title" className={styles.cardTitle}>
              {t.byCategory}
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'budgets' })}>
              {t.editBudgets}
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
              {t.savingsGoals}
            </h2>
            <Link to="/goals" className={styles.textLink}>
              {t.linkedToGoals}
            </Link>
          </div>
          {data.savingsGoals.length === 0 && <p className={styles.quiet}>{t.savingsEmpty}</p>}
          {data.savingsGoals.map((g) => (
            <SavingsRow key={g.view.goal.id} goal={g} money={whole} hidden={hidden} />
          ))}
          <ReminderBox
            has={data.hasReminder}
            onAdd={async () => {
              // The savings goal's share of this month's income, in round hundreds; $100 without income yet.
              const suggested = Math.round((s.income * data.savingsTarget) / 10000) * 10000 || 10000;
              await addSavingsReminder(suggested, today);
              setMessage(t.reminderAdded);
            }}
          />
        </section>
      </div>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="tx-title">
          <div className={styles.cardHead}>
            <h2 id="tx-title" className={styles.cardTitle}>
              {month === monthOf(today) ? t.recentTx : t.txIn(monthName(month))}
            </h2>
            <span className={styles.quiet}>{t.txHint}</span>
          </div>
          {data.transactions.length === 0 ? (
            <p className={styles.quiet}>{t.txEmpty(monthLabel(month))}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t.columns.date}</th>
                    <th scope="col">{t.columns.description}</th>
                    <th scope="col">{t.columns.category}</th>
                    <th scope="col">{t.columns.source}</th>
                    <th scope="col" className={styles.right}>
                      {t.columns.amount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDayMonth(tx.day)}</td>
                      <td>
                        <button type="button" className={styles.rowButton} onClick={() => setOpen({ kind: 'tx', transaction: tx })}>
                          {tx.description}
                        </button>
                      </td>
                      <td className={!tx.categoryId ? styles.unsorted : undefined}>{categoryName(tx.categoryId)}</td>
                      <td>{SOURCE[tx.source]}</td>
                      <td className={cx(styles.right, styles.amount, tx.amount > 0 && styles.strong)}>{money(tx.amount, { signed: true })}</td>
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
              {t.trend}
            </h2>
            <span className={styles.quiet}>{t.trendHint}</span>
          </div>
          <ol className={styles.trend} aria-label={t.trendLabel}>
            {data.trend.map((m) => (
              <li key={m.month} className={styles.trendMonth}>
                <span className={styles.trendBars}>
                  {m.budget > 0 && <span className={styles.trendBudget} style={{ bottom: `${(m.budget / trendMax) * 100}%` }} aria-hidden="true" />}
                  <span
                    className={cx(styles.trendBar, m.over && styles.trendOver, m.month === month && !m.over && styles.trendNow)}
                    style={{ height: `${(m.spent / trendMax) * 100}%` }}
                    aria-hidden="true"
                  />
                </span>
                <span className={cx(styles.trendLabel, m.month === month && styles.strong)}>{monthLabel(m.month, true)}</span>
                <span className="visually-hidden">
                  {t.trendMonth(monthLabel(m.month), whole(m.spent), m.budget ? whole(m.budget) : null, m.over)}
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

function Stat({ label, amount, of, children }: { label: string; amount: ReactNode; of?: string | null; children: ReactNode }) {
  const t = useT().finance;
  return (
    <section className={styles.stat} aria-label={label}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statAmount}>
        {amount} {of && <span className={styles.ofBudget}>{t.of(of)}</span>}
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
  const t = useT().finance;
  return (
    <span className={cx(styles.budgetFigure, c.over && styles.overFigure)}>
      {money(c.spent)}
      {c.budget !== null ? ` / ${money(c.budget)}` : ''}
      {c.over ? t.over : c.budget === null ? t.noLimit : ''}
    </span>
  );
}

function SavingsRow({ goal, money, hidden }: { goal: SavingsGoal; money: (cents: number) => string; hidden: boolean }) {
  const t = useT().finance;
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
        {t.savedOf(money(saved), money(target))}
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
  const t = useT().finance;
  return (
    <div className={styles.reminder}>
      {has ? (
        t.reminderOn
      ) : (
        <>
          {t.payYourself}{' '}
          <button type="button" className={styles.inlineButton} onClick={onAdd}>
            {t.remindMe}
          </button>
        </>
      )}
    </div>
  );
}

function NetWorth({ hasAccounts, revealed, value, short = false, onReveal, onAccounts }: { hasAccounts: boolean; revealed: boolean; value: string; short?: boolean; onReveal: () => void; onAccounts: () => void }) {
  const t = useT().finance;
  if (!hasAccounts) {
    return (
      <>
        <span className={styles.worthHidden} aria-hidden="true">
          {HIDDEN_MONEY}
        </span>
        <button type="button" className={styles.textButton} onClick={onAccounts}>
          {short ? t.addAccounts : t.addAccountsLong}
        </button>
      </>
    );
  }
  return (
    <>
      {revealed ? <span className={styles.statAmount}>{value}</span> : <span className={styles.worthHidden}>{HIDDEN_MONEY}</span>}
      <span className={styles.worthActions}>
        <button type="button" className={styles.textButton} aria-pressed={revealed} onClick={onReveal}>
          {revealed ? t.hide : short ? t.reveal : t.revealLong}
        </button>
        <button type="button" className={styles.textButton} onClick={onAccounts}>
          {t.accounts}
        </button>
      </span>
    </>
  );
}

