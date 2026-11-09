import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { CsvError, readStatement, type DateOrder, type Statement } from '@/domain/csv';
import { parseMoney } from '@/domain/finance';
import {
  addBudget,
  addTransaction,
  deleteTransaction,
  FinanceError,
  importTransactions,
  removeAccount,
  removeBudget,
  saveAccount,
  saveBudgets,
  setFinanceSettings,
  suggestCategory,
  updateTransaction,
  type Account,
  type Budget,
  type SavingsGoal,
  type Transaction,
} from '@/data';
import { Button, Segmented } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { prepareImage } from '@/lib/images';
import { formatDayShort } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { messages, useT } from '@/i18n';
import styles from './Finance.module.css';

function Field({ label, children, hint }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return text ? (
    <p className={styles.formError} role="alert">
      {text}
    </p>
  ) : null;
}

const problem = (error: unknown) => (error instanceof FinanceError || error instanceof CsvError ? error.message : messages().finance.dialog.saveFailed);

/** Cents → what the amount field shows: "50000", or "38.40" when there's a fraction. */
function editable(cents: number): string {
  const value = Math.abs(cents) / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

// ---- Add or edit a transaction ----

type Kind = 'expense' | 'income' | 'savings';

type TxProps = {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
  budgets: Budget[];
  goals: SavingsGoal[];
  today: string;
  currency: string;
  onSaved: (text: string) => void;
};

export function TransactionDialog(props: TxProps) {
  const t = useT().finance.dialog;
  const title = props.transaction ? t.editTx : t.addExpense;
  return (
    <Dialog open={props.open} onClose={props.onClose} title={title}>
      {props.open && <TransactionForm key={props.transaction?.id ?? 'new'} {...props} />}
    </Dialog>
  );
}

function TransactionForm({ onClose, transaction, budgets, goals, today, currency, onSaved }: TxProps) {
  const t = useT().finance.dialog;
  const kindOf = (categoryId: string | null): Kind => budgets.find((b) => b.id === categoryId)?.kind ?? (transaction && transaction.amount > 0 ? 'income' : 'expense');
  const [kind, setKind] = useState<Kind>(transaction ? kindOf(transaction.categoryId) : 'expense');
  const [form, setForm] = useState({
    amount: transaction ? editable(transaction.amount) : '',
    description: transaction?.description ?? '',
    categoryId: transaction?.categoryId ?? '',
    day: transaction?.day ?? today,
    goalId: transaction?.goalId ?? '',
    notes: transaction?.notes ?? '',
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const choices = budgets.filter((b) => b.kind === kind);

  function pickKind(next: Kind) {
    setKind(next);
    const fixed = budgets.find((b) => b.kind === next && next !== 'expense');
    set('categoryId', fixed?.id ?? (budgets.find((b) => b.id === form.categoryId)?.kind === 'expense' ? form.categoryId : ''));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseMoney(form.amount);
    if (cents === null || cents === 0) return setError(t.enterAmount);
    const amount = kind === 'income' ? Math.abs(cents) : -Math.abs(cents);
    const categoryId = form.categoryId || (kind !== 'expense' ? (choices[0]?.id ?? null) : null);
    setBusy(true);
    try {
      const fields = { day: form.day, description: form.description, amount, categoryId, goalId: kind === 'savings' ? form.goalId || null : null, notes: form.notes };
      if (transaction) await updateTransaction(transaction.id, fields);
      else await addTransaction({ ...fields, receipt: receipt ? { ...(await prepareImage(receipt, 640)), name: receipt.name } : null });
      onSaved(transaction ? t.savedShort : t.added(formatMoney(amount, currency, { signed: true }), form.description.trim()));
      onClose();
    } catch (err) {
      setError(problem(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Segmented
        label={t.kind}
        value={kind}
        onChange={pickKind}
        options={(['expense', 'income', 'savings'] as const).map((k) => ({ value: k, label: t.kinds[k] }))}
      />
      <div className={styles.fieldRow}>
        <Field label={t.amount(currency)}>
          {(id) => <input id={id} data-autofocus inputMode="decimal" autoComplete="off" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="50.000" />}
        </Field>
        <Field label={t.date}>{(id) => <input id={id} type="date" value={form.day} onChange={(e) => set('day', e.target.value)} />}</Field>
      </div>
      <Field label={kind === 'income' ? t.from : t.whatFor}>
        {(id) => (
          <input
            id={id}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            onBlur={async () => {
              if (kind !== 'expense' || form.categoryId || !form.description.trim()) return;
              const guess = await suggestCategory(form.description);
              if (guess && budgets.some((b) => b.id === guess && b.kind === 'expense')) set('categoryId', guess);
            }}
            placeholder={t.placeholders[kind]}
          />
        )}
      </Field>
      {kind === 'expense' && (
        <Field label={t.category}>
          {(id) => (
            <select id={id} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">{t.notSortedYet}</option>
              {choices.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      {kind === 'savings' && (
        <Field label={t.savingsGoal} hint={goals.length ? t.goalHint : t.noGoalHint}>
          {(id) => (
            <select id={id} value={form.goalId} onChange={(e) => set('goalId', e.target.value)}>
              <option value="">{t.noGoal}</option>
              {goals.map((g) => (
                <option key={g.view.goal.id} value={g.view.goal.id}>
                  {g.view.goal.title}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      {!transaction && kind === 'expense' && (
        <Field label={t.receipt} hint={t.receiptHint}>
          {(id) => <input id={id} type="file" accept="image/*" capture="environment" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />}
        </Field>
      )}
      <Field label={t.notes}>{(id) => <input id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t.optional} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {transaction && (
          <Button
            variant="quiet"
            className={styles.dangerButton}
            onClick={async () => {
              await deleteTransaction(transaction.id);
              onSaved(t.deleted);
              onClose();
            }}
          >
            {t.delete}
          </Button>
        )}
        <span className={styles.spacer} />
        <Button onClick={onClose}>{t.cancel}</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {transaction ? t.save : t.add}
        </Button>
      </div>
    </form>
  );
}

// ---- Import a bank CSV ----

export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (text: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={messages().finance.dialog.importTitle}>
      {open && <ImportForm onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function ImportForm({ onClose, onDone }: { onClose: () => void; onDone: (text: string) => void }) {
  const t = useT().finance.dialog;
  const [text, setText] = useState<{ name: string; body: string } | null>(null);
  const [order, setOrder] = useState<DateOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  let statement: Statement | null = null;
  let readError = '';
  if (text) {
    try {
      statement = readStatement(text.body, order ?? 'dmy');
      if (order && statement.order !== order) statement = { ...statement, order };
    } catch (err) {
      readError = problem(err);
    }
  }
  const days = statement?.rows.map((r) => r.day).sort() ?? [];

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!statement?.rows.length) return setError(t.chooseCsv);
        setBusy(true);
        try {
          const r = await importTransactions(statement.rows);
          onDone(t.imported(r.added, r.duplicates, r.uncategorised));
          onClose();
        } catch (err) {
          setError(problem(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className={styles.lead}>{t.importLead}</p>
      <Field label={t.csvFile}>
        {(id) => (
          <input
            id={id}
            data-autofocus
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setError('');
              setOrder(null);
              setText(file ? { name: file.name, body: await file.text() } : null);
            }}
          />
        )}
      </Field>
      {statement && (
        <div className={styles.preview} role="status">
          <strong>{t.preview(statement.rows.length)}</strong>
          {days.length > 0 && t.previewRange(formatDayShort(days[0]!), formatDayShort(days.at(-1)!))}
          {statement.skipped > 0 && t.skipped(statement.skipped)}.
        </div>
      )}
      {statement && (
        <Field label={t.datesWritten} hint={t.datesHint}>
          {(id) => (
            <select id={id} value={order ?? statement.order} onChange={(e) => setOrder(e.target.value as DateOrder)}>
              <option value="dmy">{t.orders.dmy}</option>
              <option value="mdy">{t.orders.mdy}</option>
              <option value="ymd">{t.orders.ymd}</option>
            </select>
          )}
        </Field>
      )}
      <ErrorLine text={readError || error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onClose}>{t.cancel}</Button>
        <Button type="submit" variant="primary" disabled={busy || !statement?.rows.length}>
          {t.import}
        </Button>
      </div>
    </form>
  );
}

// ---- Budgets ----

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'JPY', 'VND', 'SGD', 'INR', 'CHF'];

export function BudgetsDialog({ open, onClose, budgets, currency, savingsTarget }: { open: boolean; onClose: () => void; budgets: Budget[]; currency: string; savingsTarget: number }) {
  return (
    <Dialog open={open} onClose={onClose} title={messages().finance.dialog.editBudgets}>
      {open && <BudgetsForm budgets={budgets} currency={currency} savingsTarget={savingsTarget} onClose={onClose} />}
    </Dialog>
  );
}

function BudgetsForm({ budgets, currency, savingsTarget, onClose }: { budgets: Budget[]; currency: string; savingsTarget: number; onClose: () => void }) {
  const t = useT().finance.dialog;
  const spending = budgets.filter((b) => b.kind === 'expense');
  const [rows, setRows] = useState(spending.map((b) => ({ id: b.id, name: b.name, amount: b.amount === null ? '' : editable(b.amount) })));
  const [newName, setNewName] = useState('');
  const [cur, setCur] = useState(currency);
  const [target, setTarget] = useState(String(Math.round(savingsTarget * 100)));
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const parsed = rows.map((r) => {
        const amount = r.amount.trim() ? parseMoney(r.amount) : null;
        if (r.amount.trim() && amount === null) throw new FinanceError(t.notAmount(r.amount, r.name));
        return { id: r.id, name: r.name, amount: amount === null ? null : Math.abs(amount) };
      });
      await saveBudgets(parsed);
      const pct = Number(target);
      await setFinanceSettings({ currency: cur, savingsTarget: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) / 100 : savingsTarget });
      onClose();
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.lead}>{t.budgetsLead}</p>
      <ul className={styles.budgetRows}>
        {rows.map((r, i) => (
          <li key={r.id}>
            <input aria-label={t.categoryName} value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input
              aria-label={t.monthlyFor(r.name)}
              inputMode="decimal"
              placeholder={t.noLimit}
              value={r.amount}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
            />
            <Button
              variant="quiet"
              size="sm"
              aria-label={t.removeItem(r.name)}
              onClick={async () => {
                await removeBudget(r.id);
                setRows(rows.filter((x) => x.id !== r.id));
              }}
            >
              {t.remove}
            </Button>
          </li>
        ))}
      </ul>
      <div className={styles.addRow}>
        <input aria-label={t.newCategory} placeholder={t.newCategoryPlaceholder} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button
          size="sm"
          onClick={async () => {
            try {
              const b = await addBudget(newName);
              setRows([...rows, { id: b.id, name: b.name, amount: '' }]);
              setNewName('');
              setError('');
            } catch (err) {
              setError(problem(err));
            }
          }}
        >
          {t.addCategory}
        </Button>
      </div>
      <div className={styles.fieldRow}>
        <Field label={t.currency}>
          {(id) => (
            <select id={id} value={cur} onChange={(e) => setCur(e.target.value)}>
              {[...new Set([currency, ...CURRENCIES])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.savingsTarget}>{(id) => <input id={id} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />}</Field>
      </div>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onClose}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {t.saveBudgets}
        </Button>
      </div>
    </form>
  );
}

// ---- Accounts (net worth) ----

export function AccountsDialog({ open, onClose, accounts, currency }: { open: boolean; onClose: () => void; accounts: Account[]; currency: string }) {
  return (
    <Dialog open={open} onClose={onClose} title={messages().finance.dialog.accountsTitle}>
      {open && <AccountsForm accounts={accounts} currency={currency} onClose={onClose} />}
    </Dialog>
  );
}

function AccountsForm({ accounts, currency, onClose }: { accounts: Account[]; currency: string; onClose: () => void }) {
  const t = useT().finance.dialog;
  const [draft, setDraft] = useState({ name: '', kind: 'asset' as Account['kind'], balance: '' });
  const [error, setError] = useState('');
  return (
    <div className={styles.form}>
      <p className={styles.lead}>{t.accountsLead}</p>
      {accounts.length > 0 && (
        <ul className={styles.accountList}>
          {accounts.map((a) => (
            <li key={a.id}>
              <span>
                {a.name}
                <span className={styles.hint}>{a.kind === 'asset' ? t.own : t.owe}</span>
              </span>
              <span className={styles.amount}>{formatMoney(a.kind === 'asset' ? a.balance : -a.balance, currency)}</span>
              <Button variant="quiet" size="sm" aria-label={t.removeItem(a.name)} onClick={() => removeAccount(a.id)}>
                {t.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className={styles.addAccount}
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const cents = parseMoney(draft.balance);
          if (cents === null) return setError(t.enterBalance);
          const sent = draft;
          try {
            await saveAccount({ name: sent.name, kind: sent.kind, balance: Math.abs(cents) });
            // Clear only what was saved: anything typed while it saved stays.
            setDraft((d) => (d.name === sent.name && d.balance === sent.balance ? { name: '', kind: d.kind, balance: '' } : d));
            setError('');
          } catch (err) {
            setError(problem(err));
          }
        }}
      >
        <Field label={t.account}>{(id) => <input id={id} data-autofocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t.accountPlaceholder} />}</Field>
        <Field label={t.kindLabel}>
          {(id) => (
            <select id={id} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Account['kind'] })}>
              <option value="asset">{t.iOwn}</option>
              <option value="debt">{t.iOwe}</option>
            </select>
          )}
        </Field>
        <Field label={t.balance}>{(id) => <input id={id} inputMode="decimal" value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: e.target.value })} placeholder="2.500.000" />}</Field>
        <Button type="submit">{t.addAccount}</Button>
      </form>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button variant="primary" onClick={onClose}>
          {t.done}
        </Button>
      </div>
    </div>
  );
}
