import { addDays, dayOfMonth, dayToDate, diffDays, makeDay, month, startOfWeek, year, type Day } from './days';
import { dayState, type HabitInput, type HabitLogInput } from './habits';

/** Minutes from local midnight; a day runs 0 to 1440. */
export type Span = { startMin: number; endMin: number };

export const DAY_MINUTES = 1440;
/** Tasks scheduled without an estimate fill half an hour. */
export const DEFAULT_BLOCK_MINUTES = 30;

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** "09:30" → 570; null when it isn't a time. */
export function parseClock(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** 570 → "09:30". 1440 reads as "24:00". */
export function clockLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Rounds to the nearest step, kept inside the day. */
export function snapMinutes(minutes: number, step = 15): number {
  return Math.min(DAY_MINUTES - step, Math.max(0, Math.round(minutes / step) * step));
}

/** The part of a timed event (UTC ISO start and end) that falls on a local day, or null. */
export function spanOnDay(startIso: string, endIso: string, day: Day): Span | null {
  const dayStart = dayToDate(day).getTime();
  const dayEnd = dayToDate(addDays(day, 1)).getTime();
  const start = Date.parse(startIso);
  // Zero-length events still take a sliver of the day they start on.
  const end = Math.max(Date.parse(endIso), start + 1);
  if (start >= dayEnd || end <= dayStart) return null;
  const startMin = start <= dayStart ? 0 : minutesOfDay(new Date(start));
  const endMin = end >= dayEnd ? DAY_MINUTES : Math.max(startMin, Math.round((end - dayStart) / 60_000));
  return { startMin, endMin };
}

/** Whether an all-day event (start day, exclusive end day) covers a day. */
export function coversDay(start: Day, endExclusive: Day, day: Day): boolean {
  return day >= start && day < (endExclusive > start ? endExclusive : addDays(start, 1));
}

/** A task's time block on its day: its time, for its estimate (or half an hour), never past midnight. */
export function blockSpan(time: string, estimateMin: number | null): Span | null {
  const startMin = parseClock(time);
  if (startMin === null) return null;
  return { startMin, endMin: Math.min(DAY_MINUTES, startMin + Math.max(15, estimateMin ?? DEFAULT_BLOCK_MINUTES)) };
}

/**
 * Places overlapping items side by side: each gets a column and the number of columns
 * in its group of overlaps. Items that don't overlap anything stay full width.
 */
export function layoutColumns<T extends Span>(items: readonly T[]): Array<T & { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: Array<T & { col: number; cols: number }> = [];
  let group: Array<T & { col: number; cols: number }> = [];
  let groupEnd = -1;
  let colEnds: number[] = [];
  const close = () => {
    const cols = colEnds.length;
    for (const item of group) item.cols = cols;
    out.push(...group);
    group = [];
    colEnds = [];
  };
  for (const item of sorted) {
    const end = Math.max(item.endMin, item.startMin + 1);
    if (group.length && item.startMin >= groupEnd) close();
    let col = colEnds.findIndex((e) => e <= item.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(end);
    } else colEnds[col] = end;
    group.push({ ...item, col, cols: 1 });
    groupEnd = Math.max(groupEnd, end);
  }
  close();
  return out;
}

/** Monday to Sunday of the day's week. */
export function weekDays(day: Day): Day[] {
  const monday = startOfWeek(day);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Six weeks from the Monday on or before the 1st, for a month grid. */
export function monthGrid(day: Day): Day[] {
  const first = startOfWeek(makeDay(year(day), month(day), 1));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function firstOfMonth(day: Day): Day {
  return makeDay(year(day), month(day), 1);
}

/** The same day of another month, clamped (31 Jan + 1 month = 28 Feb). */
export function addMonths(day: Day, n: number): Day {
  const index = year(day) * 12 + month(day) - 1 + n;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return makeDay(y, m, Math.min(dayOfMonth(day), new Date(Date.UTC(y, m, 0)).getUTCDate()));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "28 Sep – 4 Oct 2026", "5 – 11 Oct 2026", "29 Dec 2025 – 4 Jan 2026". */
export function rangeLabel(from: Day, to: Day): string {
  const d = (day: Day) => dayOfMonth(day);
  const m = (day: Day) => MONTHS[month(day) - 1];
  if (year(from) !== year(to)) return `${d(from)} ${m(from)} ${year(from)} – ${d(to)} ${m(to)} ${year(to)}`;
  if (month(from) !== month(to)) return `${d(from)} ${m(from)} – ${d(to)} ${m(to)} ${year(to)}`;
  return `${d(from)} – ${d(to)} ${m(to)} ${year(to)}`;
}

/** Habits done and due on a day ("habits 5/6"), or null when none are due. */
export function habitsOnDay(habits: ReadonlyArray<{ input: HabitInput; logs: readonly HabitLogInput[] }>, day: Day, today: Day): { done: number; due: number } | null {
  let done = 0;
  let due = 0;
  for (const { input, logs } of habits) {
    const state = dayState(input, logs.find((l) => l.day === day), day, today);
    if (state === 'done') done++;
    if (state !== 'off' && state !== 'before') due++;
    else if (state === 'off' && input.schedule.type === 'timesPerWeek' && day >= input.startDay) due++;
  }
  return due ? { done, due } : null;
}

/** "in 40 min", "in 2 hours", "now", or null once it has started more than its length ago. */
export function startsIn(startMs: number, endMs: number, now: number): string | null {
  if (endMs <= now) return null;
  if (startMs <= now) return 'now';
  const minutes = Math.round((startMs - now) / 60_000);
  if (minutes < 60) return `in ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? 'in an hour' : `in ${hours} hours`;
}

/** Local days from one day to another, inclusive. */
export function daysBetween(from: Day, to: Day): Day[] {
  return Array.from({ length: Math.max(0, diffDays(from, to) + 1) }, (_, i) => addDays(from, i));
}
