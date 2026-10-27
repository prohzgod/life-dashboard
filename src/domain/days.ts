/** A local calendar day, `YYYY-MM-DD`. All arithmetic runs on UTC midnights, so DST never shifts a day. */
export type Day = string;

const MS_PER_DAY = 86_400_000;

function parts(day: Day): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number);
  return [y!, m!, d!];
}

function fromUtc(ms: number): Day {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function utc(day: Day): number {
  const [y, m, d] = parts(day);
  return Date.UTC(y, m - 1, d);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The local day of a Date (not its UTC day). */
export function toDay(date: Date): Day {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of a day, as a Date. */
export function dayToDate(day: Day): Date {
  const [y, m, d] = parts(day);
  return new Date(y, m - 1, d);
}

export function makeDay(year: number, month: number, date: number): Day {
  return fromUtc(Date.UTC(year, month - 1, date));
}

export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && makeDay(...parts(value)) === value;
}

export function addDays(day: Day, n: number): Day {
  return fromUtc(utc(day) + n * MS_PER_DAY);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: Day, b: Day): number {
  return Math.round((utc(b) - utc(a)) / MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(day: Day): number {
  return new Date(utc(day)).getUTCDay();
}

/** The Monday of the day's week. */
export function startOfWeek(day: Day): Day {
  return addDays(day, -((weekday(day) + 6) % 7));
}

export function year(day: Day): number {
  return parts(day)[0];
}

export function month(day: Day): number {
  return parts(day)[1];
}

export function dayOfMonth(day: Day): number {
  return parts(day)[2];
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Months from a's month to b's month, ignoring the day. */
export function diffMonths(a: Day, b: Day): number {
  return (year(b) - year(a)) * 12 + (month(b) - month(a));
}

/** 1 for 1 January. */
export function dayOfYear(day: Day): number {
  return diffDays(makeDay(year(day), 1, 1), day) + 1;
}

export function daysInYear(y: number): number {
  return diffDays(makeDay(y, 1, 1), makeDay(y + 1, 1, 1));
}

/** ISO 8601 week number (weeks start Monday; week 1 holds the first Thursday). */
export function isoWeek(day: Day): number {
  const thursday = addDays(startOfWeek(day), 3);
  return Math.floor((dayOfYear(thursday) - 1) / 7) + 1;
}

export const maxDay = (a: Day, b: Day) => (a > b ? a : b);
