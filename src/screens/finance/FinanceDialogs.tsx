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

const problem = (error: unknown) => (error instanceof FinanceError || error instanceof CsvError ? error.message : 'That didn’t save. Try again.');

/** Cents → what the amount field shows: "38.40". */
const editable = (cents: number) => (Math.abs(cents) / 100).toFixed(2);

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
  const title = props.transaction ? 'Edit transaction' : 'Add expense';
  return (
    <Dialog open={props.open} onClose={props.onClose} title={title}>
      {props.open && <TransactionForm key={props.transaction?.id ?? 'new'} {...props} />}
    </Dialog>
  );
}

function TransactionForm({ onClose, transaction, budgets, goals, today, currency, onSaved }: TxProps) {
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
    if (cents === null || cents === 0) return setError('Enter an amount, like 38.40.');
    const amount = kind === 'income' ? Math.abs(cents) : -Math.abs(cents);
    const categoryId = form.categoryId || (kind !== 'expense' ? (choices[0]?.id ?? null) : null);
    setBusy(true);
    try {
      const fields = { day: form.day, description: form.description, amount, categoryId, goalId: kind === 'savings' ? form.goalId || null : null, notes: form.notes };
      if (transaction) await updateTransaction(transaction.id, fields);
      else await addTransaction({ ...fields, receipt: receipt ? { ...(await prepareImage(receipt, 640)), name: receipt.name } : null });
      onSaved(transaction ? 'Saved.' : `Added ${formatMoney(amount, currency, { signed: true })} for ${form.description.trim()}.`);
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
        label="Kind"
        value={kind}
        onChange={pickKind}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
          { value: 'savings', label: 'To savings' },
        ]}
      />
      <div className={styles.fieldRow}>
        <Field label={`Amount (${currency})`}>
          {(id) => <input id={id} data-autofocus inputMode="decimal" autoComplete="off" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="38.40" />}
        </Field>
        <Field label="Date">{(id) => <input id={id} type="date" value={form.day} onChange={(e) => set('day', e.target.value)} />}</Field>
      </div>
      <Field label={kind === 'income' ? 'From' : kind === 'savings' ? 'What for' : 'What for'}>
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
            placeholder={kind === 'income' ? 'Salary' : kind === 'savings' ? 'To emergency fund' : 'Groceries'}
          />
        )}
      </Field>
      {kind === 'expense' && (
        <Field label="Category">
          {(id) => (
            <select id={id} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">Not sorted yet</option>
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
        <Field label="Savings goal" hint={goals.length ? 'The goal’s progress moves with this.' : 'Make a goal with a money target in Goals to link it here.'}>
          {(id) => (
            <select id={id} value={form.goalId} onChange={(e) => set('goalId', e.target.value)}>
              <option value="">No goal</option>
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
        <Field label="Receipt photo" hint="Optional. Kept on this device with the expense.">
          {(id) => <input id={id} type="file" accept="image/*" capture="environment" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />}
        </Field>
      )}
      <Field label="Notes">{(id) => <input id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {transaction && (
          <Button
            variant="quiet"
            className={styles.dangerButton}
            onClick={async () => {
              await deleteTransaction(transaction.id);
              onSaved('Deleted.');
              onClose();
            }}
          >
            Delete
          </Button>
        )}
        <span className={styles.spacer} />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {transaction ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  );
}

// ---- Import a bank CSV ----

export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (text: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Import a bank CSV">
      {open && <ImportForm onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function ImportForm({ onClose, onDone }: { onClose: () => void; onDone: (text: string) => void }) {
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
        if (!statement?.rows.length) return setError('Choose a CSV file with transactions first.');
        setBusy(true);
        try {
          const r = await importTransactions(statement.rows);
          onDone(
            `Imported ${r.added} ${r.added === 1 ? 'transaction' : 'transactions'}${r.duplicates ? `, skipped ${r.duplicates} already here` : ''}${r.uncategorised ? `. ${r.uncategorised} need a category` : ''}.`,
          );
          onClose();
        } catch (err) {
          setError(problem(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className={styles.lead}>Download a CSV from your bank’s website and choose it here. It’s read on this device; nothing is sent anywhere, and no bank login is needed.</p>
      <Field label="CSV file">
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
          <strong>
            {statement.rows.length} {statement.rows.length === 1 ? 'transaction' : 'transactions'}
          </strong>
          {days.length > 0 && ` from ${formatDayShort(days[0]!)} to ${formatDayShort(days.at(-1)!)}`}
          {statement.skipped > 0 && `. ${statement.skipped} ${statement.skipped === 1 ? 'row' : 'rows'} without a date or amount will be left out`}.
        </div>
      )}
      {statement && (
        <Field label="Dates are written" hint="Change this if the dates above look wrong.">
          {(id) => (
            <select id={id} value={order ?? statement.order} onChange={(e) => setOrder(e.target.value as DateOrder)}>
              <option value="dmy">Day / month / year</option>
              <option value="mdy">Month / day / year</option>
              <option value="ymd">Year-month-day</option>
            </select>
          )}
        </Field>
      )}
      <ErrorLine text={readError || error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy || !statement?.rows.length}>
          Import
        </Button>
      </div>
    </form>
  );
}

// ---- Budgets ----

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'JPY', 'VND', 'SGD', 'INR', 'CHF'];

export function BudgetsDialog({ open, onClose, budgets, currency, savingsTarget }: { open: boolean; onClose: () => void; budgets: Budget[]; currency: string; savingsTarget: number }) {
  return (
    <Dialog open={open} onClose={onClose} title="Edit budgets">
      {open && <BudgetsForm budgets={budgets} currency={currency} savingsTarget={savingsTarget} onClose={onClose} />}
    </Dialog>
  );
}

function BudgetsForm({ budgets, currency, savingsTarget, onClose }: { budgets: Budget[]; currency: string; savingsTarget: number; onClose: () => void }) {
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
        if (r.amount.trim() && amount === null) throw new FinanceError(`“${r.amount}” for ${r.name} isn’t an amount.`);
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
      <p className={styles.lead}>Monthly amounts. Leave one empty to track spending without a limit.</p>
      <ul className={styles.budgetRows}>
        {rows.map((r, i) => (
          <li key={r.id}>
            <input aria-label="Category name" value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input
              aria-label={`Monthly budget for ${r.name}`}
              inputMode="decimal"
              placeholder="No limit"
              value={r.amount}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
            />
            <Button
              variant="quiet"
              size="sm"
              aria-label={`Remove ${r.name}`}
              onClick={async () => {
                await removeBudget(r.id);
                setRows(rows.filter((x) => x.id !== r.id));
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className={styles.addRow}>
        <input aria-label="New category" placeholder="New category, e.g. Pets" value={newName} onChange={(e) => setNewName(e.target.value)} />
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
          Add category
        </Button>
      </div>
      <div className={styles.fieldRow}>
        <Field label="Currency">
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
        <Field label="Savings goal (% of income)">{(id) => <input id={id} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />}</Field>
      </div>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">
          Save budgets
        </Button>
      </div>
    </form>
  );
}

// ---- Accounts (net worth) ----

export function AccountsDialog({ open, onClose, accounts, currency }: { open: boolean; onClose: () => void; accounts: Account[]; currency: string }) {
  return (
    <Dialog open={open} onClose={onClose} title="Accounts and net worth">
      {open && <AccountsForm accounts={accounts} currency={currency} onClose={onClose} />}
    </Dialog>
  );
}

function AccountsForm({ accounts, currency, onClose }: { accounts: Account[]; currency: string; onClose: () => void }) {
  const [draft, setDraft] = useState({ name: '', kind: 'asset' as Account['kind'], balance: '' });
  const [error, setError] = useState('');
  return (
    <div className={styles.form}>
      <p className={styles.lead}>Type in balances yourself; nothing connects to a bank. Update them when you like.</p>
      {accounts.length > 0 && (
        <ul className={styles.accountList}>
          {accounts.map((a) => (
            <li key={a.id}>
              <span>
                {a.name}
                <span className={styles.hint}>{a.kind === 'asset' ? ' · I own' : ' · I owe'}</span>
              </span>
              <span className={styles.amount}>{formatMoney(a.kind === 'asset' ? a.balance : -a.balance, currency)}</span>
              <Button variant="quiet" size="sm" aria-label={`Remove ${a.name}`} onClick={() => removeAccount(a.id)}>
                Remove
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
          if (cents === null) return setError('Enter the balance, like 2500.');
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
        <Field label="Account">{(id) => <input id={id} data-autofocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Everyday account" />}</Field>
        <Field label="Kind">
          {(id) => (
            <select id={id} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Account['kind'] })}>
              <option value="asset">I own</option>
              <option value="debt">I owe</option>
            </select>
          )}
        </Field>
        <Field label="Balance">{(id) => <input id={id} inputMode="decimal" value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: e.target.value })} placeholder="2,500" />}</Field>
        <Button type="submit">Add account</Button>
      </form>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
