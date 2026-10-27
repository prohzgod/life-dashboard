import { addDays, dayOfYear, daysInYear, diffDays, diffMonths, isDay, isoWeek, startOfWeek, toDay, weekday } from './days';

describe('days', () => {
  it('adds and diffs days across month, year and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // EU DST change
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-10-26', '2026-11-01')).toBe(6);
    expect(diffDays('2026-11-01', '2026-10-26')).toBe(-6);
  });

  it('knows weekdays, week starts and ISO weeks', () => {
    expect(weekday('2026-10-25')).toBe(0); // Sunday
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
    expect(isoWeek('2026-09-29')).toBe(40); // matches the Today mockup
    expect(isoWeek('2027-01-01')).toBe(53);
    expect(isoWeek('2026-01-01')).toBe(1);
  });

  it('counts day of year and month differences', () => {
    expect(dayOfYear('2026-09-29')).toBe(272); // matches the Today mockup
    expect(daysInYear(2028)).toBe(366);
    expect(diffMonths('2026-10-31', '2027-01-01')).toBe(3);
  });

  it('validates day strings and reads a local Date', () => {
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2028-02-29')).toBe(true);
    expect(isDay('26-1-1')).toBe(false);
    expect(toDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
