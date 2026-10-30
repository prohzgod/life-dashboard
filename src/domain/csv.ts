import { messages } from '@/i18n/locale';
import { makeDay, type Day } from './days';
import { parseMoney } from './finance';

/** Reads bank statement CSVs: any delimiter, quoted fields, the usual column names, three date orders. */

export class CsvError extends Error {}

/** RFC 4180 rows. The delimiter is whichever of comma, semicolon or tab the first line uses most. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]!;
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((f) => f.trim()));
}

export type Columns = { date: number; description: number; amount: number | null; debit: number | null; credit: number | null };

const NAMES = {
  date: /^(transaction |posting |posted |booking |value )?date$|^date posted$|^datum$|^fecha$/i,
  description: /description|details|payee|merchant|narrative|memo|name|reference|particulars|beschreibung|concepto/i,
  amount: /^(amount|value|sum|betrag|importe)( \(.*\))?$/i,
  debit: /debit|withdrawal|money out|paid out|outflow|spent/i,
  credit: /credit|deposit|money in|paid in|inflow|received/i,
};

/** Finds the date, description and amount (or debit and credit) columns from the header row. */
export function findColumns(header: readonly string[]): Columns {
  const find = (re: RegExp, taken: number[] = []) => header.findIndex((h, i) => !taken.includes(i) && re.test(h.trim()));
  const date = find(NAMES.date);
  const amount = find(NAMES.amount);
  const debit = find(NAMES.debit, [amount]);
  const credit = find(NAMES.credit, [amount, debit]);
  const description = find(NAMES.description, [date, amount, debit, credit]);
  if (date < 0) throw new CsvError(messages().errors.finance.noDate);
  if (amount < 0 && debit < 0 && credit < 0) throw new CsvError(messages().errors.finance.noAmount);
  if (description < 0) throw new CsvError(messages().errors.finance.noDescription);
  return { date, description, amount: amount >= 0 ? amount : null, debit: debit >= 0 ? debit : null, credit: credit >= 0 ? credit : null };
}

export type DateOrder = 'ymd' | 'dmy' | 'mdy';

const DATE = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/;

/** Which order the dates use, judged from all of them: a part above 12 can only be a day. */
export function detectDateOrder(values: readonly string[], fallback: DateOrder = 'dmy'): DateOrder {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const v of values) {
    const m = DATE.exec(v.trim());
    if (!m) continue;
    if (m[1]!.length === 4) return 'ymd';
    if (Number(m[1]) > 12) firstOver12 = true;
    if (Number(m[2]) > 12) secondOver12 = true;
  }
  if (firstOver12) return 'dmy';
  if (secondOver12) return 'mdy';
  return fallback;
}

export function parseDate(value: string, order: DateOrder): Day | null {
  const m = DATE.exec(value.trim());
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fullYear = (y: number) => (y < 100 ? 2000 + y : y);
  const [y, mo, d] = order === 'ymd' ? [a, b, c] : order === 'dmy' ? [fullYear(c), b, a] : [fullYear(c), a, b];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const day = makeDay(y, mo, d);
  return Number(day.slice(8)) === d ? day : null;
}

export type StatementRow = { day: Day; description: string; amount: number };
export type Statement = { rows: StatementRow[]; skipped: number; order: DateOrder };

/** The transactions in a bank CSV. Rows that don't read (totals, notes) are counted, not guessed. */
export function readStatement(text: string, fallbackOrder: DateOrder = 'dmy'): Statement {
  const table = parseCsv(text);
  if (table.length < 2) throw new CsvError(messages().errors.finance.empty);
  const headerAt = table.findIndex((r) => r.some((f) => NAMES.date.test(f)));
  if (headerAt < 0) throw new CsvError(messages().errors.finance.noDate);
  const cols = findColumns(table[headerAt]!);
  const body = table.slice(headerAt + 1);
  const order = detectDateOrder(body.map((r) => r[cols.date] ?? ''), fallbackOrder);
  const rows: StatementRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const day = parseDate(r[cols.date] ?? '', order);
    let amount: number | null = null;
    if (cols.amount !== null) amount = parseMoney(r[cols.amount] ?? '');
    else {
      const out = cols.debit !== null ? parseMoney(r[cols.debit] ?? '') : null;
      const inn = cols.credit !== null ? parseMoney(r[cols.credit] ?? '') : null;
      if (out !== null || inn !== null) amount = (inn ?? 0) - Math.abs(out ?? 0);
    }
    const description = (r[cols.description] ?? '').replace(/\s+/g, ' ').trim();
    if (!day || amount === null || amount === 0) {
      skipped++;
      continue;
    }
    rows.push({ day, description: description || 'Unnamed transaction', amount });
  }
  return { rows, skipped, order };
}

/** Same day, amount and description: a transaction imported before. */
export function importKey(row: StatementRow): string {
  return `${row.day}|${row.amount}|${row.description.toLowerCase().replace(/\s+/g, ' ')}`;
}
