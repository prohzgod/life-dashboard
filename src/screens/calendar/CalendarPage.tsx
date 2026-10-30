import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clockLabel, rangeLabel, snapMinutes } from '@/domain/calendar';
import { dayToDate, isDay, isoWeek, type Day } from '@/domain/days';
import { areasRepo, eventsRepo, loadCalendarRange, scheduleTask, tasksRepo, updateEvent, type Calendar, type CalendarEvent, type CalendarRange, type Task } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Segmented } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { messages, useT } from '@/i18n';
import { formatDate, weekdayName } from '@/lib/format';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { AddCalendarDialog, BlockDialog, CalendarSettingsDialog, EventDialog, type EventDraft } from './CalendarDialogs';
import { CalendarSidebar } from './CalendarSidebar';
import { readLayers, stepAnchor, viewRange, writeLayers, type CalendarView, type GridItem, type Layers } from './items';
import { MonthGrid, YearGrid } from './MonthViews';
import { MobileCalendar } from './MobileCalendar';
import { TimeGrid } from './TimeGrid';
import styles from './Calendar.module.css';

const DESKTOP_HOUR = 50;
const PHONE_HOUR = 37;
const VIEWS: CalendarView[] = ['day', 'week', 'month', 'year'];

type Open =
  | { kind: 'event'; event?: CalendarEvent & { calendar: Calendar }; draft?: EventDraft }
  | { kind: 'block'; task: Task; draft?: EventDraft }
  | { kind: 'add' }
  | { kind: 'settings'; calendar: Calendar }
  | null;

export type CalendarScreen = {
  view: CalendarView;
  anchor: Day;
  today: Day;
  range: CalendarRange | undefined;
  layers: Layers;
  areas: NonNullable<ReturnType<typeof useAreas>>;
  go: (view: CalendarView, anchor: Day) => void;
  openItem: (item: GridItem) => void;
  openAllDay: (eventId: string) => void;
  newEvent: (draft?: EventDraft) => void;
};

function useAreas() {
  return useLiveQuery(() => areasRepo.listOrdered(), []);
}

/** /calendar: a week grid of your calendars and time blocks; day, month and year too. Phones get the day view first. */
export function CalendarPage() {
  const today = useToday();
  const phone = useIsMobile();
  const [params, setParams] = useSearchParams();
  const requested = params.get('view') as CalendarView | null;
  const view: CalendarView = requested && VIEWS.includes(requested) && !(phone && requested === 'year') ? requested : phone ? 'day' : 'week';
  const date = params.get('date');
  const anchor = date && isDay(date) ? date : today;
  const { from, to, days } = viewRange(view, anchor);
  const range = useLiveQuery(() => loadCalendarRange(from, to, today), [from, to, today]);
  const areas = useAreas() ?? [];
  const [layers, setLayersState] = useState(readLayers);
  const [open, setOpen] = useState<Open>(null);
  const [message, setMessage] = useState('');

  const setLayers = (next: Layers) => {
    setLayersState(next);
    writeLayers(next);
  };
  const go = (nextView: CalendarView, nextAnchor: Day) => {
    const next = new URLSearchParams(params);
    next.set('view', nextView);
    if (nextAnchor === today) next.delete('date');
    else next.set('date', nextAnchor);
    setParams(next, { replace: true });
  };

  async function openItem(item: GridItem) {
    if (item.kind === 'block') {
      const task = await tasksRepo.get(item.taskId!);
      if (task) setOpen({ kind: 'block', task });
    } else openAllDay(item.eventId!);
  }
  function openAllDay(eventId: string) {
    const event = range?.events.find((e) => e.id === eventId);
    if (event) setOpen({ kind: 'event', event });
  }
  const newEvent = (draft?: EventDraft) => setOpen({ kind: 'event', draft: draft ?? { day: view === 'day' || view === 'week' ? (days.includes(today) ? today : days[0]!) : anchor, startMin: 9 * 60 } });

  const screen: CalendarScreen = { view, anchor, today, range, layers, areas, go, openItem, openAllDay, newEvent };
  const hourHeight = phone ? PHONE_HOUR : DESKTOP_HOUR;

  const body = phone ? (
    <MobileCalendar {...screen} hourHeight={hourHeight} />
  ) : (
    <div className={styles.page}>
      <CalendarSidebar
        anchor={anchor}
        today={today}
        highlight={view === 'week' ? days : view === 'day' ? [anchor] : []}
        range={range}
        layers={layers}
        onLayers={setLayers}
        onPickDay={(day) => go(view === 'month' || view === 'year' ? 'day' : view, day)}
        onAddCalendar={() => setOpen({ kind: 'add' })}
        onCalendarSettings={(calendar) => setOpen({ kind: 'settings', calendar })}
        onScheduleTask={(task) => setOpen({ kind: 'block', task })}
      />
      <div className={styles.main}>
        <Header view={view} anchor={anchor} days={days} today={today} go={go} onNewEvent={() => newEvent()} />
        {range &&
          (view === 'day' || view === 'week' ? (
            <TimeGrid
              days={days}
              today={today}
              range={range}
              layers={layers}
              areas={areas}
              hourHeight={hourHeight}
              onSlot={(day, startMin) => newEvent({ day, startMin })}
              onItem={openItem}
              onAllDay={openAllDay}
            />
          ) : view === 'month' ? (
            <MonthGrid anchor={anchor} today={today} range={range} layers={layers} areas={areas} onPickDay={(day) => go('day', day)} />
          ) : (
            <YearGrid anchor={anchor} today={today} range={range} layers={layers} onPickDay={(day) => go('day', day)} />
          ))}
        {range && <Legend calendars={range.calendars} layers={layers} />}
      </div>
    </div>
  );

  return (
    <CalendarDnd hourHeight={hourHeight} range={range}>
      {body}
      <EventDialog open={open?.kind === 'event'} onClose={() => setOpen(null)} event={open?.kind === 'event' ? open.event : undefined} draft={open?.kind === 'event' ? open.draft : undefined} calendars={range?.calendars ?? []} />
      <BlockDialog open={open?.kind === 'block'} onClose={() => setOpen(null)} task={open?.kind === 'block' ? open.task : undefined} draft={open?.kind === 'block' ? open.draft : undefined} today={today} />
      <AddCalendarDialog
        open={open?.kind === 'add'}
        onClose={() => setOpen(null)}
        onAdded={(r) => setMessage(messages().calendar.added(r.calendar.name, r.added))}
      />
      <CalendarSettingsDialog calendar={open?.kind === 'settings' ? open.calendar : null} onClose={() => setOpen(null)} onMessage={setMessage} />
      {message && <Toast onDone={() => setMessage('')}>{message}</Toast>}
    </CalendarDnd>
  );
}

function Header({ view, anchor, days, today, go, onNewEvent }: { view: CalendarView; anchor: Day; days: Day[]; today: Day; go: CalendarScreen['go']; onNewEvent: () => void }) {
  const t = useT().calendar;
  const [title, sub] =
    view === 'week'
      ? [t.week(isoWeek(days[0]!)), rangeLabel(days[0]!, days[6]!)]
      : view === 'day'
        ? [weekdayName(anchor), formatDate(anchor)]
        : view === 'month'
          ? [t.monthName(dayToDate(anchor)), anchor.slice(0, 4)]
          : [anchor.slice(0, 4), ''];
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{title}</h1>
        {sub && <span className={styles.subtitle}>{sub}</span>}
      </div>
      <div className={styles.headerActions}>
        <Button size="sm" icon={<Icon name="plus" size={14} />} onClick={onNewEvent}>
          {t.newEvent}
        </Button>
        <Button size="sm" onClick={() => go(view, today)}>
          {t.today}
        </Button>
        <button type="button" className={styles.stepButton} aria-label={t.previous[view]} onClick={() => go(view, stepAnchor(view, anchor, -1))}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <button type="button" className={styles.stepButton} aria-label={t.next[view]} onClick={() => go(view, stepAnchor(view, anchor, 1))}>
          <Icon name="chevronRight" size={16} />
        </button>
        <Segmented
          label={t.viewLabel}
          value={view}
          onChange={(v) => go(v, anchor)}
          options={VIEWS.map((v) => ({ value: v, label: t.views[v] }))}
        />
      </div>
    </header>
  );
}

function Legend({ calendars, layers }: { calendars: Calendar[]; layers: Layers }) {
  const t = useT().calendar;
  return (
    <div className={styles.legend}>
      {layers.blocks && (
        <span className={styles.legendItem}>
          <span className={cx(styles.swatch, styles.swatchBlock)} aria-hidden="true" />
          {t.legendBlock}
        </span>
      )}
      {calendars
        .filter((c) => c.visible)
        .map((c) => (
          <span key={c.id} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: `var(--${c.color}-soft)` }} aria-hidden="true" />
            {c.name}
            {c.readOnly ? t.readOnlySuffix : ''}
          </span>
        ))}
    </div>
  );
}

// ---- Drag and drop ----

/** Drop where the pointer is; for the keyboard, where the item overlaps. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

function CalendarDnd({ hourHeight, range, children }: { hourHeight: number; range: CalendarRange | undefined; children: ReactNode }) {
  const [dragging, setDragging] = useState<{ title: string } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Arrow keys move a held item by a quarter hour, or a day sideways.
  const coordinateGetter: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
    const column = document.querySelector('[data-calendar-day]')?.getBoundingClientRect().width ?? 120;
    const step = hourHeight / 4;
    switch (event.code) {
      case 'ArrowDown':
        return { ...currentCoordinates, y: currentCoordinates.y + step };
      case 'ArrowUp':
        return { ...currentCoordinates, y: currentCoordinates.y - step };
      case 'ArrowRight':
        return { ...currentCoordinates, x: currentCoordinates.x + column };
      case 'ArrowLeft':
        return { ...currentCoordinates, x: currentCoordinates.x - column };
    }
    return undefined;
  };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Space picks up and drops; Enter still opens the item.
    useSensor(KeyboardSensor, { coordinateGetter, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] } }),
  );

  function onDragStart(event: DragStartEvent) {
    setDragging({ title: String(event.active.data.current?.title ?? '') });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    // Where the item is drawn under the pointer: dnd-kit's delta also counts the grid's own scroll, so read the overlay.
    const top = overlayRef.current?.getBoundingClientRect().top;
    setDragging(null);
    const day = over?.data.current?.day as Day | undefined;
    const column = day && document.querySelector(`[data-calendar-day="${day}"]`)?.getBoundingClientRect();
    if (!day || top === undefined || !column) return;
    const minutes = snapMinutes(((top - column.top) / hourHeight) * 60);
    const [kind, id] = String(active.id).split(':') as [string, string];
    if (kind === 'task' || kind === 'block') {
      await scheduleTask(id, day, clockLabel(minutes));
    } else if (kind === 'event') {
      const event = range?.events.find((e) => e.id === id) ?? (await eventsRepo.get(id));
      if (!event || event.readOnly || event.allDay) return;
      const start = new Date(`${day}T${clockLabel(minutes)}:00`).getTime();
      const length = Date.parse(event.end) - Date.parse(event.start);
      await updateEvent(id, { start: new Date(start).toISOString(), end: new Date(start + length).toISOString() });
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {children}
      <DragOverlay dropAnimation={null}>{dragging && (
          <div ref={overlayRef} className={styles.dragOverlay}>
            {dragging.title}
          </div>
        )}</DragOverlay>
    </DndContext>
  );
}
