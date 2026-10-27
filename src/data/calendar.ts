import type { Area } from '@design/tokens';
import { habitsOnDay } from '@/domain/calendar';
import { addDays, dayToDate, type Day } from '@/domain/days';
import { IcsError, parseIcs, type IcsEvent } from '@/domain/ics';
import { db } from './db';
import { listHabitData } from './habitActions';
import { newId, nowIso } from './ids';
import { calendarsRepo, eventsRepo, tasksRepo } from './repositories';
import { getCurrentSpaceId } from './session';
import type { Calendar, CalendarEvent, Task } from './types';

export { IcsError };

const PERSONAL: Omit<Calendar, 'id' | 'spaceId' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
  name: 'Personal',
  color: 'growth',
  source: 'local',
  url: null,
  readOnly: false,
  visible: true,
  lastSyncedAt: null,
};

/** Every space has a local Personal calendar. Runs at startup and after an import. */
export async function ensureCalendars(): Promise<void> {
  await db.transaction('rw', db.calendars, async () => {
    if (!(await calendarsRepo.list((c) => c.source === 'local')).length) await calendarsRepo.create(PERSONAL);
  });
}

/** Local calendars first, then imported ones, oldest first. */
export async function listCalendars(): Promise<Calendar[]> {
  return (await calendarsRepo.list()).sort((a, b) => (a.source === b.source ? a.createdAt.localeCompare(b.createdAt) : a.source === 'local' ? -1 : 1));
}

/** The calendar an event belongs to; events from before calendars existed belong to the first local one. */
export function calendarOf(event: Pick<CalendarEvent, 'calendarId'>, calendars: readonly Calendar[]): Calendar | undefined {
  return calendars.find((c) => c.id === event.calendarId) ?? (event.calendarId === null ? calendars.find((c) => c.source === 'local') : undefined);
}

export async function setCalendarVisible(id: string, visible: boolean): Promise<void> {
  await calendarsRepo.update(id, { visible });
}

export async function updateCalendar(id: string, patch: { name?: string; color?: Area }): Promise<void> {
  await calendarsRepo.update(id, patch);
}

/** Removes an imported calendar and its events (soft delete, so an export still has them). */
export async function removeCalendar(id: string): Promise<void> {
  const calendar = await calendarsRepo.get(id);
  if (!calendar || calendar.source === 'local') return;
  await db.transaction('rw', db.calendars, db.events, async () => {
    const now = nowIso();
    const events = await db.events.where('calendarId').equals(id).filter((e) => e.deletedAt === null).toArray();
    await db.events.bulkPut(events.map((e) => ({ ...e, deletedAt: now, updatedAt: now })));
    await calendarsRepo.remove(id);
  });
}

// ---- Import ----

export type ImportResult = { calendar: Calendar; added: number; updated: number; removed: number };

/** webcal:// links are https underneath. */
export function normalizeCalendarUrl(url: string): string {
  return url.trim().replace(/^webcals?:\/\//i, 'https://');
}

/** Imports a .ics file as a new read-only calendar. */
/** The name you typed wins, then the calendar's own name, then `fallbackName` (e.g. the file name). */
export async function importIcs(text: string, { name, fallbackName, color, url = null }: { name?: string; fallbackName?: string; color: Area; url?: string | null }): Promise<ImportResult> {
  const parsed = parseIcs(text);
  const calendar = await calendarsRepo.create({
    name: name?.trim() || parsed.name || fallbackName?.trim() || 'Imported calendar',
    color,
    source: 'ics',
    url,
    readOnly: true,
    visible: true,
    lastSyncedAt: nowIso(),
  });
  const result = await replaceEvents(calendar.id, parsed.events);
  return { calendar, ...result };
}

/** Re-reads a calendar from new file contents: changed events update, new ones are added, missing ones removed. */
export async function refreshIcs(calendarId: string, text: string): Promise<ImportResult> {
  const parsed = parseIcs(text);
  const result = await replaceEvents(calendarId, parsed.events);
  const calendar = await calendarsRepo.update(calendarId, { lastSyncedAt: nowIso() });
  return { calendar, ...result };
}

/** Fetches a calendar link. Many providers don't let web apps read their links; the error says what to do instead. */
export async function fetchCalendarText(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(normalizeCalendarUrl(url), { cache: 'no-store' });
  } catch {
    throw new IcsError(
      navigator.onLine === false
        ? 'You’re offline. The calendar will refresh when you’re back online.'
        : 'That calendar didn’t let this app read it. Download its .ics file and import that instead.',
    );
  }
  if (!response.ok) throw new IcsError(`That link answered with an error (${response.status}). Check it’s the calendar’s public or secret address.`);
  return response.text();
}

export async function subscribeToCalendar(url: string, options: { name?: string; fallbackName?: string; color: Area }): Promise<ImportResult> {
  const text = await fetchCalendarText(url);
  return importIcs(text, { ...options, url: normalizeCalendarUrl(url) });
}

export async function refreshFromUrl(calendarId: string): Promise<ImportResult> {
  const calendar = await calendarsRepo.get(calendarId);
  if (!calendar?.url) throw new IcsError('This calendar came from a file. Import the file again to update it.');
  return refreshIcs(calendarId, await fetchCalendarText(calendar.url));
}

const keyOf = (e: { uid: string | null; recurrenceId: string | null }) => `${e.uid}|${e.recurrenceId}`;

async function replaceEvents(calendarId: string, parsed: readonly IcsEvent[]): Promise<{ added: number; updated: number; removed: number }> {
  return db.transaction('rw', db.events, async () => {
    const now = nowIso();
    const existing = await db.events.where('calendarId').equals(calendarId).filter((e) => e.deletedAt === null).toArray();
    const byKey = new Map(existing.map((e) => [keyOf(e), e]));
    const seen = new Set<string>();
    const puts: CalendarEvent[] = [];
    let added = 0;
    let updated = 0;
    for (const p of parsed) {
      const key = keyOf(p);
      if (seen.has(key)) continue;
      seen.add(key);
      const fields = { title: p.title, start: p.start, end: p.end, allDay: p.allDay, location: p.location, notes: p.notes };
      const current = byKey.get(key);
      if (current) {
        if ((Object.keys(fields) as Array<keyof typeof fields>).some((k) => current[k] !== fields[k])) {
          puts.push({ ...current, ...fields, updatedAt: now });
          updated++;
        }
      } else {
        puts.push({
          id: newId(),
          spaceId: getCurrentSpaceId(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          calendarId,
          source: 'ics',
          uid: p.uid,
          recurrenceId: p.recurrenceId,
          readOnly: true,
          ...fields,
        });
        added++;
      }
    }
    const gone = existing.filter((e) => !seen.has(keyOf(e)));
    puts.push(...gone.map((e) => ({ ...e, deletedAt: now, updatedAt: now })));
    await db.events.bulkPut(puts);
    return { added, updated, removed: gone.length };
  });
}

// ---- Your own events ----

export type EventInput = Pick<CalendarEvent, 'title' | 'start' | 'end' | 'allDay' | 'location' | 'notes'> & { calendarId: string };

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  return eventsRepo.create({ ...input, title: input.title.trim() || 'Untitled event', source: 'local', uid: null, recurrenceId: null, readOnly: false });
}

export async function updateEvent(id: string, patch: Partial<EventInput>): Promise<void> {
  const event = await eventsRepo.get(id);
  if (!event || event.readOnly) return;
  await eventsRepo.update(id, patch.title === undefined ? patch : { ...patch, title: patch.title.trim() || 'Untitled event' });
}

export async function deleteEvent(id: string): Promise<void> {
  const event = await eventsRepo.get(id);
  if (event && !event.readOnly) await eventsRepo.remove(id);
}

// ---- Time blocks: tasks with a day and a time ----

/** Puts a task on the calendar at a day and time. */
export async function scheduleTask(taskId: string, day: Day, time: string): Promise<void> {
  const task = await tasksRepo.get(taskId);
  if (!task) return;
  await tasksRepo.update(taskId, { doOn: day, time, status: task.status === 'inbox' || task.status === 'someday' ? 'open' : task.status });
}

/** Takes a task off the calendar, keeping its day. */
export async function unscheduleTask(taskId: string): Promise<void> {
  await tasksRepo.update(taskId, { time: null });
}

// ---- Reading a range ----

export type CalendarRange = {
  calendars: Calendar[];
  /** Events from visible calendars that touch the range, with their calendar. */
  events: Array<CalendarEvent & { calendar: Calendar }>;
  /** Tasks with a time, on days in the range. */
  blocks: Task[];
  /** Open tasks without a time, for dragging onto the week. */
  unscheduled: Task[];
  /** Habits done and due, per day. */
  habits: Record<Day, { done: number; due: number }>;
};

/** Everything the calendar shows from `from` up to (not including) `to`. */
export async function loadCalendarRange(from: Day, to: Day, today: Day): Promise<CalendarRange> {
  const fromMs = dayToDate(from).getTime();
  const toMs = dayToDate(to).getTime();
  const [calendars, events, tasks, habits] = await Promise.all([listCalendars(), eventsRepo.list(), tasksRepo.list(), listHabitData()]);

  const inRange = events.flatMap((event) => {
    const calendar = calendarOf(event, calendars);
    if (!calendar?.visible) return [];
    const touches = event.allDay
      ? event.start < to && (event.end > event.start ? event.end : addDays(event.start, 1)) > from
      : Date.parse(event.start) < toMs && Math.max(Date.parse(event.end), Date.parse(event.start) + 1) > fromMs;
    return touches ? [{ ...event, calendar }] : [];
  });

  const blocks = tasks.filter((t) => t.time && t.doOn && t.doOn >= from && t.doOn < to && t.status !== 'someday' && t.parentTaskId === null);
  const unscheduled = tasks
    .filter((t) => !t.time && t.parentTaskId === null && t.status === 'open' && (t.doOn === null || (t.doOn >= today && t.doOn < to)))
    .sort((a, b) => (a.doOn ?? '9999').localeCompare(b.doOn ?? '9999') || (a.priority ?? 9) - (b.priority ?? 9) || a.sortKey.localeCompare(b.sortKey))
    .slice(0, 8);

  const perDay: CalendarRange['habits'] = {};
  for (let day = from; day < to; day = addDays(day, 1)) {
    const counts = habitsOnDay(habits, day, today);
    if (counts) perDay[day] = counts;
  }
  return { calendars, events: inRange, blocks, unscheduled, habits: perDay };
}
