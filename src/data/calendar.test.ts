// @vitest-environment node
import { exportAll, importReplacingAll } from './backup';
import {
  createEvent,
  deleteEvent,
  ensureCalendars,
  importIcs,
  listCalendars,
  loadCalendarRange,
  normalizeCalendarUrl,
  refreshIcs,
  removeCalendar,
  scheduleTask,
  setCalendarVisible,
  unscheduleTask,
  updateEvent,
} from './calendar';
import { addDays, toDay } from '@/domain/days';
import { db } from './db';
import { eventsRepo, tasksRepo } from './repositories';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

function ics(...events: string[][]): string {
  return ['BEGIN:VCALENDAR', 'X-WR-CALNAME:Work', ...events.flatMap((e) => ['BEGIN:VEVENT', ...e, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
}

const standup = ['UID:s', 'SUMMARY:Stand-up', 'DTSTART:20260928T093000Z', 'DTEND:20260928T094500Z', 'RRULE:FREQ=DAILY;COUNT=3'];
const review = ['UID:r', 'SUMMARY:Product review', 'DTSTART:20260928T140000Z', 'DTEND:20260928T153000Z'];

describe('calendars', () => {
  it('starts with one local Personal calendar', async () => {
    const calendars = await listCalendars();
    expect(calendars.map((c) => [c.name, c.source, c.readOnly])).toEqual([['Personal', 'local', false]]);
    await ensureCalendars();
    expect(await listCalendars()).toHaveLength(1);
  });

  it('imports a file as a read-only calendar named after it', async () => {
    const { calendar, added } = await importIcs(ics(standup, review), { color: 'career' });
    expect(calendar).toMatchObject({ name: 'Work', source: 'ics', readOnly: true, visible: true });
    expect(added).toBe(4);
    const events = await eventsRepo.list((e) => e.calendarId === calendar.id);
    expect(events.every((e) => e.readOnly && e.source === 'ics')).toBe(true);
  });

  it('refreshes without duplicates: updates, adds and removes', async () => {
    const { calendar } = await importIcs(ics(standup, review), { name: 'Office', color: 'career' });
    expect(calendar.name).toBe('Office');
    const moved = ['UID:r', 'SUMMARY:Product review', 'DTSTART:20260928T150000Z', 'DTEND:20260928T163000Z'];
    const dentist = ['UID:d', 'SUMMARY:Dentist', 'DTSTART:20261001T110000Z', 'DTEND:20261001T120000Z'];
    const result = await refreshIcs(calendar.id, ics(['UID:s', 'SUMMARY:Stand-up', 'DTSTART:20260928T093000Z', 'DTEND:20260928T094500Z', 'RRULE:FREQ=DAILY;COUNT=2'], moved, dentist));
    expect(result).toMatchObject({ added: 1, updated: 1, removed: 1 });
    expect((await eventsRepo.list((e) => e.calendarId === calendar.id)).map((e) => e.title).sort()).toEqual(['Dentist', 'Product review', 'Stand-up', 'Stand-up']);
  });

  it('removes an imported calendar with its events, but never the local one', async () => {
    const { calendar } = await importIcs(ics(review), { color: 'career' });
    await removeCalendar(calendar.id);
    expect(await listCalendars()).toHaveLength(1);
    expect(await eventsRepo.list((e) => e.calendarId === calendar.id)).toHaveLength(0);
    const [personal] = await listCalendars();
    await removeCalendar(personal!.id);
    expect(await listCalendars()).toHaveLength(1);
  });

  it('turns webcal links into https', () => {
    expect(normalizeCalendarUrl(' webcal://example.com/a.ics ')).toBe('https://example.com/a.ics');
  });
});

describe('events', () => {
  it('creates, edits and deletes your own events; imported ones stay as they are', async () => {
    const [personal] = await listCalendars();
    const lunch = await createEvent({ calendarId: personal!.id, title: ' Lunch with Linh ', start: '2026-09-29T11:30:00.000Z', end: '2026-09-29T12:30:00.000Z', allDay: false, location: '', notes: '' });
    expect(lunch.title).toBe('Lunch with Linh');
    await updateEvent(lunch.id, { title: 'Lunch' });
    expect((await eventsRepo.get(lunch.id))!.title).toBe('Lunch');
    await deleteEvent(lunch.id);
    expect(await eventsRepo.get(lunch.id)).toBeUndefined();

    const { calendar } = await importIcs(ics(review), { color: 'career' });
    const [imported] = await eventsRepo.list((e) => e.calendarId === calendar.id);
    await updateEvent(imported!.id, { title: 'Changed' });
    await deleteEvent(imported!.id);
    expect((await eventsRepo.get(imported!.id))!.title).toBe('Product review');
  });
});

describe('loadCalendarRange', () => {
  it('returns visible events, time blocks, unscheduled tasks and habit counts for the week', async () => {
    const { calendar } = await importIcs(ics(standup, review), { color: 'career' });
    const block = await tasksRepo.create(task({ title: 'Essay #9 outline', doOn: '2026-09-29', time: '15:00', estimateMin: 45 }));
    const loose = await tasksRepo.create(task({ title: 'Renew car insurance', estimateMin: 15 }));
    await tasksRepo.create(task({ title: 'Someday', status: 'someday' }));

    const week = await loadCalendarRange('2026-09-28', '2026-10-05', '2026-09-29');
    expect(week.events.map((e) => e.title)).toEqual(['Stand-up', 'Stand-up', 'Stand-up', 'Product review']);
    expect(week.events[0]!.calendar.id).toBe(calendar.id);
    expect(week.blocks.map((t) => t.id)).toEqual([block.id]);
    expect(week.unscheduled.map((t) => t.id)).toEqual([loose.id]);
    // The seeded habits start today, so only today has habits due.
    const today = toDay(new Date());
    expect((await loadCalendarRange(today, addDays(today, 1), today)).habits[today]).toEqual({ done: 0, due: 3 });

    await setCalendarVisible(calendar.id, false);
    expect((await loadCalendarRange('2026-09-28', '2026-10-05', '2026-09-29')).events).toHaveLength(0);
  });

  it('schedules and unschedules a task', async () => {
    const t = await tasksRepo.create(task({ title: 'Plan Japan budget', status: 'inbox' }));
    await scheduleTask(t.id, '2026-10-01', '10:00');
    expect(await tasksRepo.get(t.id)).toMatchObject({ doOn: '2026-10-01', time: '10:00', status: 'open' });
    await unscheduleTask(t.id);
    expect(await tasksRepo.get(t.id)).toMatchObject({ doOn: '2026-10-01', time: null });
  });
});

describe('older data', () => {
  it('upgrades events from before calendars and imports old exports', async () => {
    const file = await exportAll();
    file.tables.events = [{ id: 'old', createdAt: 'x', updatedAt: 'x', deletedAt: null, source: 'google', title: 'Old', start: '2026-09-29T09:00:00.000Z', end: '2026-09-29T10:00:00.000Z', allDay: false, readOnly: false }];
    delete file.tables.calendars;
    await importReplacingAll(file);
    expect(await db.events.get('old')).toMatchObject({ calendarId: null, source: 'local', uid: null, location: '', notes: '' });
    const week = await loadCalendarRange('2026-09-28', '2026-10-05', '2026-09-29');
    expect(week.events.map((e) => [e.title, e.calendar.name])).toEqual([['Old', 'Personal']]);
  });
});

function task(fields: Partial<Parameters<typeof tasksRepo.create>[0]>): Parameters<typeof tasksRepo.create>[0] {
  return {
    areaId: null,
    goalId: null,
    keyResultId: null,
    parentTaskId: null,
    title: 'Task',
    notes: '',
    status: 'open',
    priority: null,
    doOn: null,
    time: null,
    dueAt: null,
    estimateMin: null,
    rrule: null,
    reminderAt: null,
    completedAt: null,
    sortKey: 'a0',
    repeatOfId: null,
    ...fields,
  };
}
