import { CsvError, detectDateOrder, findColumns, importKey, parseCsv, parseDate, readStatement } from './csv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, CRLF and semicolons', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
    expect(parseCsv('Datum;Betrag\n01.09.2026;-12,50')).toEqual([
      ['Datum', 'Betrag'],
      ['01.09.2026', '-12,50'],
    ]);
  });
});

describe('dates', () => {
  it('work out the order from the values', () => {
    expect(detectDateOrder(['2026-09-28'])).toBe('ymd');
    expect(detectDateOrder(['03/09/2026', '28/09/2026'])).toBe('dmy');
    expect(detectDateOrder(['09/03/2026', '09/28/2026'])).toBe('mdy');
    expect(detectDateOrder(['01/02/2026'], 'mdy')).toBe('mdy');
    expect(parseDate('28/09/26', 'dmy')).toBe('2026-09-28');
    expect(parseDate('09/28/2026', 'mdy')).toBe('2026-09-28');
    expect(parseDate('31/02/2026', 'dmy')).toBeNull();
  });
});

describe('readStatement', () => {
  it('reads an amount column, skipping rows that are not transactions', () => {
    const text = 'Date,Description,Amount\n28/09/2026,Countdown Supermarket,-38.40\n28/09/2026,ACME PAYROLL,"4,200.00"\n,Closing balance,1234.00\n';
    const s = readStatement(text);
    expect(s.order).toBe('dmy');
    expect(s.rows).toEqual([
      { day: '2026-09-28', description: 'Countdown Supermarket', amount: -3840 },
      { day: '2026-09-28', description: 'ACME PAYROLL', amount: 420000 },
    ]);
    expect(s.skipped).toBe(1);
  });

  it('reads debit and credit columns, and a header below some bank notes', () => {
    const text = 'Account: 12-3456\n\nPosted Date,Payee,Money Out,Money In\n2026-09-26,Metro card top-up,20.00,\n2026-09-24,Refund,,5.00\n';
    expect(readStatement(text).rows).toEqual([
      { day: '2026-09-26', description: 'Metro card top-up', amount: -2000 },
      { day: '2026-09-24', description: 'Refund', amount: 500 },
    ]);
  });

  it('explains files it cannot read', () => {
    expect(() => readStatement('just one line')).toThrow(CsvError);
    expect(() => findColumns(['Date', 'Amount'])).toThrow(/description column/);
    expect(() => findColumns(['Date', 'Payee'])).toThrow(/amount column/);
  });

  it('keys rows so a second import skips them', () => {
    expect(importKey({ day: '2026-09-28', description: 'Groceries  Shop', amount: -3840 })).toBe('2026-09-28|-3840|groceries shop');
  });
});
