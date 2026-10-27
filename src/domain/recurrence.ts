import { addDays, type Day, dayOfMonth, daysInMonth, diffDays, diffMonths, maxDay, month, startOfWeek, weekday, year } from './days';

export const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** The subset of iCalendar RRULE the app understands. */
export type RRule = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  byDay?: Weekday[];
  /** 1–31, or -1 for the last day of the month. */
  byMonthDay?: number[];
};

const FREQS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

/** Parses "FREQ=WEEKLY;BYDAY=TU". Returns null for anything outside the supported subset. */
export function parseRRule(text: string): RRule | null {
  const rule: RRule = { freq: 'DAILY', interval: 1 };
  let hasFreq = false;
  for (const part of text.replace(/^RRULE:/i, '').split(';').filter(Boolean)) {
    const [key, value = ''] = part.split('=');
    switch (key?.toUpperCase()) {
      case 'FREQ': {
        const freq = value.toUpperCase();
        if (!(FREQS as readonly string[]).includes(freq)) return null;
        rule.freq = freq as RRule['freq'];
        hasFreq = true;
        break;
      }
      case 'INTERVAL': {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1) return null;
        rule.interval = n;
        break;
      }
      case 'BYDAY': {
        const days = value.toUpperCase().split(',');
        if (!days.every((d) => (WEEKDAYS as readonly string[]).includes(d))) return null;
        rule.byDay = sortWeekdays(days as Weekday[]);
        break;
      }
      case 'BYMONTHDAY': {
        const days = value.split(',').map(Number);
        if (!days.every((d) => Number.isInteger(d) && ((d >= 1 && d <= 31) || d === -1))) return null;
        rule.byMonthDay = days;
        break;
      }
      default:
        return null;
    }
  }
  return hasFreq ? rule : null;
}

export function formatRRule(rule: RRule): string {
  const parts = [`FREQ=${rule.freq}`];
  if (rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.byDay?.length) parts.push(`BYDAY=${sortWeekdays(rule.byDay).join(',')}`);
  if (rule.byMonthDay?.length) parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  return parts.join(';');
}

function sortWeekdays(days: Weekday[]): Weekday[] {
  // Monday first, as people read a week.
  const order = (d: Weekday) => (WEEKDAYS.indexOf(d) + 6) % 7;
  return [...new Set(days)].sort((a, b) => order(a) - order(b));
}

/** Whether `day` is an occurrence of a series that started on `anchor`. */
export function matches(rule: RRule, anchor: Day, day: Day): boolean {
  if (day < anchor) return false;
  switch (rule.freq) {
    case 'DAILY':
      return diffDays(anchor, day) % rule.interval === 0;
    case 'WEEKLY': {
      const weeks = diffDays(startOfWeek(anchor), startOfWeek(day)) / 7;
      const days = rule.byDay ?? [WEEKDAYS[weekday(anchor)]!];
      return weeks % rule.interval === 0 && days.includes(WEEKDAYS[weekday(day)]!);
    }
    case 'MONTHLY': {
      if (diffMonths(anchor, day) % rule.interval !== 0) return false;
      const last = daysInMonth(year(day), month(day));
      // Without BYMONTHDAY, repeat on the anchor's date, falling back to the month's last day (31st → 30th).
      const wanted = rule.byMonthDay ?? [Math.min(dayOfMonth(anchor), last)];
      return wanted.some((d) => (d === -1 ? last : d) === dayOfMonth(day));
    }
    case 'YEARLY': {
      if ((year(day) - year(anchor)) % rule.interval !== 0 || month(day) !== month(anchor)) return false;
      return dayOfMonth(day) === Math.min(dayOfMonth(anchor), daysInMonth(year(day), month(day)));
    }
  }
}

const SEARCH_LIMIT_DAYS = 366 * 8;

/** The first occurrence on or after `from`. */
export function firstOnOrAfter(rule: RRule, anchor: Day, from: Day): Day {
  for (let i = 0; i <= SEARCH_LIMIT_DAYS; i++) {
    const day = addDays(from, i);
    if (matches(rule, anchor, day)) return day;
  }
  throw new Error(`No occurrence of ${formatRRule(rule)} within 8 years of ${from}`);
}

/** The first occurrence strictly after `after`. */
export function nextOccurrence(rule: RRule, anchor: Day, after: Day): Day {
  return firstOnOrAfter(rule, anchor, addDays(after, 1));
}

/**
 * When to do a repeating task again after it was completed on `completedOn`.
 * "Every N days" counts from the day you did it; calendar rules (a weekday, a date) keep their schedule.
 */
export function nextAfterCompletion(rule: RRule, doOn: Day | null, completedOn: Day): Day {
  if (rule.freq === 'DAILY' && !rule.byDay) return addDays(completedOn, rule.interval);
  const anchor = doOn ?? completedOn;
  return nextOccurrence(rule, anchor, maxDay(anchor, completedOn));
}

const DAY_NAMES: Record<Weekday, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
};

/** Plain English, e.g. "Every Tuesday", "Every 3 days", "Monthly on day 1". */
export function describeRRule(rule: RRule): string {
  const n = rule.interval;
  const unit = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }[rule.freq];
  const every = n === 1 ? `Every ${unit}` : n === 2 ? `Every other ${unit}` : `Every ${n} ${unit}s`;

  if (rule.freq === 'WEEKLY' && rule.byDay?.length) {
    const days = rule.byDay;
    if (days.join() === 'MO,TU,WE,TH,FR' && n === 1) return 'Every weekday';
    if (days.join() === 'SA,SU' && n === 1) return 'Every weekend';
    const names = listJoin(days.map((d) => DAY_NAMES[d]));
    return n === 1 ? `Every ${names}` : `${every} on ${names}`;
  }
  if (rule.freq === 'MONTHLY' && rule.byMonthDay?.length) {
    const dates = listJoin(rule.byMonthDay.map((d) => (d === -1 ? 'the last day' : `day ${d}`)));
    return n === 1 ? `Monthly on ${dates}` : `${every} on ${dates}`;
  }
  return every;
}

/** The short form used on chips: "Repeats monthly · day 1". */
export function describeRRuleShort(rule: RRule): string {
  if (rule.interval === 1 && rule.freq === 'MONTHLY' && rule.byMonthDay?.length === 1) {
    const d = rule.byMonthDay[0]!;
    return `Repeats monthly · ${d === -1 ? 'last day' : `day ${d}`}`;
  }
  const long = describeRRule(rule);
  return `Repeats ${long.charAt(0).toLowerCase()}${long.slice(1)}`;
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}
