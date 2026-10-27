import type { Area } from '@design/tokens';
import { addDays, month, startOfWeek, toDay, type Day } from '@/domain/days';
import type { CSSProperties } from 'react';
import { addMonths, blockSpan, clockLabel, coversDay, firstOfMonth, layoutColumns, MONTH_NAMES, monthGrid, spanOnDay } from '@/domain/calendar';
import type { CalendarRange, LifeArea } from '@/data';

export type CalendarView = 'day' | 'week' | 'month' | 'year';

/** Which extra layers show on the grid. Kept per device. */
export type Layers = { blocks: boolean; habits: boolean };

/** The days a view loads: from `from` up to (not including) `to`. */
export function viewRange(view: CalendarView, anchor: Day): { from: Day; to: Day; days: Day[] } {
  switch (view) {
    case 'day':
      return { from: anchor, to: addDays(anchor, 1), days: [anchor] };
    case 'week': {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 7), days: Array.from({ length: 7 }, (_, i) => addDays(from, i)) };
    }
    case 'month': {
      const days = monthGrid(anchor);
      return { from: days[0]!, to: addDays(days.at(-1)!, 1), days };
    }
    case 'year': {
      const from = `${anchor.slice(0, 4)}-01-01`;
      return { from, to: `${Number(anchor.slice(0, 4)) + 1}-01-01`, days: [] };
    }
  }
}

/** The anchor one step back or forward. */
export function stepAnchor(view: CalendarView, anchor: Day, dir: 1 | -1): Day {
  if (view === 'day') return addDays(anchor, dir);
  if (view === 'week') return addDays(anchor, 7 * dir);
  if (view === 'month') return addMonths(firstOfMonth(anchor), dir);
  return addMonths(anchor, 12 * dir);
}

export type GridItem = {
  key: string;
  kind: 'event' | 'block';
  title: string;
  startMin: number;
  endMin: number;
  /** Area color tokens for events; blocks use the primary dashed style. */
  tone: Area | 'block';
  done: boolean;
  readOnly: boolean;
  /** "09:30" or "12:30 – 13:30". */
  time: string;
  /** Under the title on longer items: the area for a block, the calendar for an event. */
  detail: string;
  calendarName: string;
  eventId?: string;
  taskId?: string;
};

export type AllDayItem = { key: string; title: string; tone: Area; eventId: string; calendarName: string };

export type DayItems = { timed: Array<GridItem & { col: number; cols: number }>; allDay: AllDayItem[] };

export function timeText(startMin: number, endMin: number): string {
  return endMin - startMin <= 15 ? clockLabel(startMin) : `${clockLabel(startMin)} – ${clockLabel(Math.min(endMin, 1440))}`;
}

/** Everything on one day of the grid, laid out side by side where it overlaps. */
export function itemsForDay(range: CalendarRange, day: Day, layers: Layers, areas: readonly LifeArea[]): DayItems {
  const timed: GridItem[] = [];
  const allDay: AllDayItem[] = [];
  for (const event of range.events) {
    if (event.allDay) {
      if (coversDay(event.start, event.end, day)) allDay.push({ key: event.id, title: event.title, tone: event.calendar.color, eventId: event.id, calendarName: event.calendar.name });
      continue;
    }
    const span = spanOnDay(event.start, event.end, day);
    if (!span) continue;
    timed.push({
      key: `${event.id}-${day}`,
      kind: 'event',
      title: event.title,
      ...span,
      tone: event.calendar.color,
      done: false,
      readOnly: event.readOnly,
      time: timeText(span.startMin, span.endMin),
      detail: event.location || event.calendar.name,
      calendarName: event.calendar.name,
      eventId: event.id,
    });
  }
  if (layers.blocks) {
    for (const task of range.blocks) {
      if (task.doOn !== day || !task.time) continue;
      const span = blockSpan(task.time, task.estimateMin);
      if (!span) continue;
      timed.push({
        key: task.id,
        kind: 'block',
        title: task.title,
        ...span,
        tone: 'block',
        done: task.status === 'done',
        readOnly: false,
        time: timeText(span.startMin, span.endMin),
        detail: areas.find((a) => a.id === task.areaId)?.name ?? 'Time block',
        calendarName: 'Time blocks',
        taskId: task.id,
      });
    }
  }
  return { timed: layoutColumns(timed), allDay };
}

/** Days that have anything on them, for the dots in the year view. */
export function daysWithItems(range: CalendarRange, layers: Layers): Set<Day> {
  const days = new Set<Day>();
  for (const event of range.events) {
    const first = event.allDay ? event.start : toDay(new Date(event.start));
    const last = event.allDay ? addDays(event.end > event.start ? event.end : addDays(event.start, 1), -1) : toDay(new Date(Math.max(Date.parse(event.end) - 1, Date.parse(event.start))));
    for (let d = first, n = 0; d <= last && n < 400; d = addDays(d, 1), n++) days.add(d);
  }
  if (layers.blocks) for (const t of range.blocks) if (t.doOn) days.add(t.doOn);
  return days;
}

const LAYERS_KEY = 'calendar-layers';

export function readLayers(): Layers {
  try {
    const stored = JSON.parse(localStorage.getItem(LAYERS_KEY) ?? 'null') as Partial<Layers> | null;
    return { blocks: stored?.blocks ?? true, habits: stored?.habits ?? true };
  } catch {
    return { blocks: true, habits: true };
  }
}

export function writeLayers(layers: Layers): void {
  try {
    localStorage.setItem(LAYERS_KEY, JSON.stringify(layers));
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
}

/** "September 2026" */
export function monthTitle(day: Day): string {
  return `${MONTH_NAMES[month(day) - 1]} ${day.slice(0, 4)}`;
}

/** An event's colors from its calendar's area token. */
export function toneStyle(tone: string): CSSProperties {
  return { background: `var(--${tone}-soft)`, color: `var(--${tone}-ink)` };
}
