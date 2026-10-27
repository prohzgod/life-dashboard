import { addDays, dayOfMonth, daysInMonth, diffDays, makeDay, month, startOfWeek, weekday, year, type Day } from './days';

/**
 * Reads iCalendar (.ics) files: VEVENTs with their times, all-day days, time zones,
 * repeat rules (RRULE, EXDATE, RECURRENCE-ID overrides). Pure: the caller stores the result.
 *
 * Timed events come back as UTC ISO strings. All-day events come back as local days,
 * with `end` exclusive (the day after the last day), as in iCalendar itself.
 */
export type IcsEvent = {
  uid: string;
  /** The original start of this occurrence for a repeating event (ISO or day), else null. */
  recurrenceId: string | null;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  notes: string;
};

export type IcsCalendar = { name: string | null; events: IcsEvent[] };

export class IcsError extends Error {}

/** Repeating events are expanded inside this window (and capped), so an endless rule stays finite. */
export type IcsWindow = { from: Date; to: Date };

const MAX_OCCURRENCES = 2000;

type Prop = { name: string; params: Record<string, string>; value: string };

/** "20260929T093000" with its zone: 'utc', a TZID, or null for floating (local) time. */
type Stamp = { day: Day; minutes: number; seconds: number; allDay: boolean; zone: 'utc' | string | null };

export function defaultWindow(now = new Date()): IcsWindow {
  return { from: new Date(now.getFullYear() - 1, now.getMonth(), 1), to: new Date(now.getFullYear() + 2, now.getMonth(), 1) };
}

export function parseIcs(text: string, window: IcsWindow = defaultWindow()): IcsCalendar {
  const lines = unfold(text);
  if (!lines.some((l) => /^BEGIN:VCALENDAR$/i.test(l.trim()))) throw new IcsError('That file isn’t a calendar (.ics) file.');

  let name: string | null = null;
  const blocks: Prop[][] = [];
  let current: Prop[] | null = null;
  let depth = 0;
  for (const line of lines) {
    const prop = parseLine(line);
    if (!prop) continue;
    if (prop.name === 'BEGIN') {
      if (prop.value.toUpperCase() === 'VEVENT' && depth === 0) current = [];
      else if (current) depth++;
      continue;
    }
    if (prop.name === 'END') {
      if (current && depth > 0) depth--;
      else if (current && prop.value.toUpperCase() === 'VEVENT') {
        blocks.push(current);
        current = null;
      }
      continue;
    }
    if (current) {
      if (depth === 0) current.push(prop);
    } else if (prop.name === 'X-WR-CALNAME' && !name) name = unescapeText(prop.value).trim() || null;
  }

  const masters: Prop[][] = [];
  const overrides: Prop[][] = [];
  for (const block of blocks) (get(block, 'RECURRENCE-ID') ? overrides : masters).push(block);

  const events: IcsEvent[] = [];
  const byKey = new Map<string, number>();
  for (const block of masters) {
    for (const event of expand(block, window)) {
      byKey.set(keyOf(event), events.length);
      events.push(event);
    }
  }
  for (const block of overrides) {
    const event = single(block);
    const rid = get(block, 'RECURRENCE-ID');
    if (!event || !rid) continue;
    const recurrenceId = stampToValue(parseStamp(rid));
    const key = `${event.uid}|${recurrenceId}`;
    const at = byKey.get(key);
    const cancelled = get(block, 'STATUS')?.value.toUpperCase() === 'CANCELLED';
    const replacement = cancelled ? null : { ...event, recurrenceId };
    if (at !== undefined) events[at] = replacement as IcsEvent;
    else if (replacement && overlaps(replacement, window)) events.push(replacement);
  }
  return { name, events: events.filter(Boolean) };
}

const keyOf = (e: IcsEvent) => `${e.uid}|${e.recurrenceId}`;

// ---- Lines ----

function unfold(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .filter((l) => l.trim() !== '');
}

function parseLine(line: string): Prop | null {
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 1) return null;
  const [head = '', ...rawParams] = splitOutsideQuotes(line.slice(0, colon), ';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: head.toUpperCase(), params, value: line.slice(colon + 1) };
}

function splitOutsideQuotes(text: string, sep: string): string[] {
  const out: string[] = [];
  let quoted = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') quoted = !quoted;
    else if (text[i] === sep && !quoted) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

function unescapeText(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

const get = (block: Prop[], name: string) => block.find((p) => p.name === name);
const getAll = (block: Prop[], name: string) => block.filter((p) => p.name === name);

// ---- Times ----

function parseStamp(prop: Prop, value = prop.value): Stamp {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/i.exec(value.trim());
  if (!m) throw new IcsError(`A date in that file isn’t readable (“${value}”).`);
  const day = makeDay(Number(m[1]), Number(m[2]), Number(m[3]));
  const allDay = prop.params.VALUE?.toUpperCase() === 'DATE' || m[4] === undefined;
  if (allDay) return { day, minutes: 0, seconds: 0, allDay: true, zone: null };
  const zone = m[7] ? 'utc' : (prop.params.TZID ?? null);
  return { day, minutes: Number(m[4]) * 60 + Number(m[5]), seconds: Number(m[6] ?? 0), allDay: false, zone };
}

/** The value stored for a stamp: a day for all-day, else UTC ISO. */
function stampToValue(stamp: Stamp): string {
  return stamp.allDay ? stamp.day : new Date(stampToMs(stamp)).toISOString();
}

function stampToMs({ day, minutes, seconds, zone }: Stamp): number {
  const [y, mo, d] = [year(day), month(day), dayOfMonth(day)];
  const h = Math.floor(minutes / 60);
  const mi = minutes % 60;
  if (zone === 'utc') return Date.UTC(y, mo - 1, d, h, mi, seconds);
  const tz = zone && formatterFor(zone);
  if (!tz) return new Date(y, mo - 1, d, h, mi, seconds).getTime();
  // Treat the wall time as UTC, then shift by the zone's offset at that moment (twice, for DST edges).
  const guess = Date.UTC(y, mo - 1, d, h, mi, seconds);
  const first = guess - offsetMs(tz, guess);
  const second = guess - offsetMs(tz, first);
  return second;
}

const formatters = new Map<string, Intl.DateTimeFormat | null>();

/** A formatter for an IANA zone; null for names Intl doesn't know (e.g. Windows zone names), read as local time. */
function formatterFor(zone: string): Intl.DateTimeFormat | null {
  if (!formatters.has(zone)) {
    try {
      formatters.set(
        zone,
        new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }),
      );
    } catch {
      formatters.set(zone, null);
    }
  }
  return formatters.get(zone)!;
}

function offsetMs(tz: Intl.DateTimeFormat, ms: number): number {
  const parts = Object.fromEntries(tz.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** "PT1H30M", "P1D", "P1W" in milliseconds (days count as 24h). */
function parseDuration(value: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value.trim());
  if (!m) return null;
  const [, sign, w = '0', d = '0', h = '0', mi = '0', s = '0'] = m;
  const ms = (((Number(w) * 7 + Number(d)) * 24 + Number(h)) * 60 + Number(mi)) * 60_000 + Number(s) * 1000;
  return sign === '-' ? -ms : ms;
}

// ---- Events ----

type Base = { uid: string; title: string; location: string; notes: string; start: Stamp; durationMs: number; durationDays: number };

function base(block: Prop[]): Base | null {
  const dtstart = get(block, 'DTSTART');
  if (!dtstart) return null;
  const start = parseStamp(dtstart);
  const dtend = get(block, 'DTEND');
  const duration = get(block, 'DURATION');
  let durationMs = 0;
  let durationDays = 1;
  if (dtend) {
    const end = parseStamp(dtend);
    if (start.allDay) durationDays = Math.max(1, diffDays(start.day, end.day));
    else durationMs = Math.max(0, stampToMs(end) - stampToMs(start));
  } else if (duration) {
    const ms = parseDuration(duration.value) ?? 0;
    if (start.allDay) durationDays = Math.max(1, Math.round(ms / 86_400_000));
    else durationMs = Math.max(0, ms);
  }
  const summary = get(block, 'SUMMARY');
  const uid = get(block, 'UID')?.value.trim() || `${summary?.value ?? 'event'}-${dtstart.value}`;
  return {
    uid,
    title: summary ? unescapeText(summary.value).trim() || 'Untitled event' : 'Untitled event',
    location: unescapeText(get(block, 'LOCATION')?.value ?? '').trim(),
    notes: unescapeText(get(block, 'DESCRIPTION')?.value ?? '').trim(),
    start,
    durationMs,
    durationDays,
  };
}

function occurrence(b: Base, start: Stamp, recurrenceId: string | null): IcsEvent {
  if (start.allDay) {
    return { uid: b.uid, recurrenceId, title: b.title, location: b.location, notes: b.notes, allDay: true, start: start.day, end: addDays(start.day, b.durationDays) };
  }
  const ms = stampToMs(start);
  return {
    uid: b.uid,
    recurrenceId,
    title: b.title,
    location: b.location,
    notes: b.notes,
    allDay: false,
    start: new Date(ms).toISOString(),
    end: new Date(ms + b.durationMs).toISOString(),
  };
}

function single(block: Prop[]): IcsEvent | null {
  const b = base(block);
  return b ? occurrence(b, b.start, null) : null;
}

function overlaps(event: IcsEvent, { from, to }: IcsWindow): boolean {
  const start = event.allDay ? new Date(`${event.start}T00:00:00`).getTime() : Date.parse(event.start);
  const end = event.allDay ? new Date(`${event.end}T00:00:00`).getTime() : Date.parse(event.end);
  return start < to.getTime() && Math.max(end, start + 1) > from.getTime();
}

function expand(block: Prop[], window: IcsWindow): IcsEvent[] {
  if (get(block, 'STATUS')?.value.toUpperCase() === 'CANCELLED') return [];
  const b = base(block);
  if (!b) return [];
  const rrule = get(block, 'RRULE');
  const rule = rrule ? parseRule(rrule.value, b.start) : null;
  if (!rule) return [occurrence(b, b.start, null)];

  const excluded = new Set<string>();
  for (const prop of getAll(block, 'EXDATE')) {
    for (const value of prop.value.split(',')) {
      const stamp = parseStamp(prop, value);
      // An EXDATE without a zone shares the event's zone.
      excluded.add(stampToValue(stamp.zone === null && !stamp.allDay ? { ...stamp, zone: b.start.zone } : stamp));
    }
  }

  const out: IcsEvent[] = [];
  let count = 0;
  for (const day of ruleDays(rule, b.start.day)) {
    const start: Stamp = { ...b.start, day };
    const startMs = start.allDay ? new Date(`${day}T00:00:00`).getTime() : stampToMs(start);
    if (rule.untilDay !== null ? day > rule.untilDay : rule.until !== null && startMs > rule.until) break;
    if (startMs >= window.to.getTime()) break;
    count++;
    if (rule.count !== null && count > rule.count) break;
    const recurrenceId = stampToValue(start);
    if (excluded.has(recurrenceId)) continue;
    const event = occurrence(b, start, recurrenceId);
    if (overlaps(event, window)) out.push(event);
    if (out.length >= MAX_OCCURRENCES) break;
  }
  return out;
}

// ---- Repeat rules ----

type Rule = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count: number | null;
  /** UTC ms for a timed UNTIL; for a date-only UNTIL see untilDay. */
  until: number | null;
  untilDay: Day | null;
  /** 0 = Sunday … 6 = Saturday, with an optional position in the month or year (1 = first, -1 = last). */
  byDay: Array<{ wd: number; n: number | null }> | null;
  byMonthDay: number[] | null;
  byMonth: number[] | null;
};

const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function parseRule(text: string, start: Stamp): Rule | null {
  const parts = Object.fromEntries(
    text
      .split(';')
      .map((p) => p.split('='))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k!.toUpperCase(), v!.toUpperCase()]),
  );
  const freq = parts.FREQ as Rule['freq'];
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null;
  const rule: Rule = { freq, interval: Math.max(1, Number(parts.INTERVAL ?? 1) || 1), count: parts.COUNT ? Number(parts.COUNT) : null, until: null, untilDay: null, byDay: null, byMonthDay: null, byMonth: null };
  if (parts.UNTIL) {
    const until = parseStamp({ name: 'UNTIL', params: {}, value: parts.UNTIL });
    if (until.allDay) {
      rule.untilDay = until.day;
    } else {
      rule.until = stampToMs(until.zone === null ? { ...until, zone: start.zone } : until);
    }
  }
  if (parts.BYDAY) {
    rule.byDay = parts.BYDAY.split(',').flatMap((d: string) => {
      const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(d);
      return m ? [{ wd: WD.indexOf(m[2]!), n: m[1] ? Number(m[1]) : null }] : [];
    });
  }
  if (parts.BYMONTHDAY) rule.byMonthDay = parts.BYMONTHDAY.split(',').map(Number).filter((n: number) => Number.isInteger(n) && n !== 0);
  if (parts.BYMONTH) rule.byMonth = parts.BYMONTH.split(',').map(Number).filter((n: number) => n >= 1 && n <= 12);
  return rule;
}

/** Candidate days in order, starting at the first occurrence. Unbounded: the caller stops. */
function* ruleDays(rule: Rule, first: Day): Generator<Day> {
  yield first;
  const maxPeriods = 50_000;
  for (let k = 0; k < maxPeriods; k++) {
    for (const day of periodDays(rule, first, k)) if (day > first) yield day;
  }
}

function periodDays(rule: Rule, first: Day, k: number): Day[] {
  const step = k * rule.interval;
  switch (rule.freq) {
    case 'DAILY': {
      const day = addDays(first, step);
      return keepDaily(rule, day) ? [day] : [];
    }
    case 'WEEKLY': {
      const monday = addDays(startOfWeek(first), step * 7);
      const wds = rule.byDay?.map((d) => d.wd) ?? [weekday(first)];
      return [0, 1, 2, 3, 4, 5, 6]
        .map((i) => addDays(monday, i))
        .filter((d) => wds.includes(weekday(d)) && (!rule.byMonth || rule.byMonth.includes(month(d))));
    }
    case 'MONTHLY': {
      const index = year(first) * 12 + month(first) - 1 + step;
      const y = Math.floor(index / 12);
      const m = (index % 12) + 1;
      if (rule.byMonth && !rule.byMonth.includes(m)) return [];
      return monthDays(rule, y, m, dayOfMonth(first));
    }
    case 'YEARLY': {
      const y = year(first) + step;
      const months = rule.byMonth ?? [month(first)];
      // A yearly rule with only BYDAY counts positions in the year when BYMONTH is absent ("the 20th Monday"); that's rare, so treat it by month.
      return months.flatMap((m) => monthDays(rule, y, m, dayOfMonth(first)));
    }
  }
}

function keepDaily(rule: Rule, day: Day): boolean {
  if (rule.byMonth && !rule.byMonth.includes(month(day))) return false;
  if (rule.byDay && !rule.byDay.some((d) => d.wd === weekday(day))) return false;
  if (rule.byMonthDay && !rule.byMonthDay.some((n) => resolveMonthDay(year(day), month(day), n) === dayOfMonth(day))) return false;
  return true;
}

function resolveMonthDay(y: number, m: number, n: number): number | null {
  const len = daysInMonth(y, m);
  const d = n > 0 ? n : len + n + 1;
  return d >= 1 && d <= len ? d : null;
}

function monthDays(rule: Rule, y: number, m: number, fallbackDate: number): Day[] {
  const len = daysInMonth(y, m);
  let dates: number[];
  if (rule.byMonthDay) {
    dates = rule.byMonthDay.map((n) => resolveMonthDay(y, m, n)).filter((d): d is number => d !== null);
  } else if (rule.byDay) {
    dates = rule.byDay.flatMap(({ wd, n }) => {
      const all: number[] = [];
      for (let d = 1; d <= len; d++) if (weekday(makeDay(y, m, d)) === wd) all.push(d);
      if (n === null) return all;
      const pick = n > 0 ? all[n - 1] : all[all.length + n];
      return pick === undefined ? [] : [pick];
    });
  } else {
    dates = fallbackDate <= len ? [fallbackDate] : [];
  }
  return [...new Set(dates)].sort((a, b) => a - b).map((d) => makeDay(y, m, d));
}
