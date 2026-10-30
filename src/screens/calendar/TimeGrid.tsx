import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { clockLabel, minutesOfDay, snapMinutes } from '@/domain/calendar';
import { dayOfMonth, type Day } from '@/domain/days';
import type { CalendarRange, LifeArea } from '@/data';
import { cx } from '@/components/ui/cx';
import { itemsForDay, toneStyle, type GridItem, type Layers } from './items';
import { messages, useT } from '@/i18n';
import styles from './Calendar.module.css';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

type Props = {
  days: Day[];
  today: Day;
  range: CalendarRange;
  layers: Layers;
  areas: readonly LifeArea[];
  hourHeight: number;
  /** The hour scrolled into view first. */
  firstHour?: number;
  phone?: boolean;
  onSlot: (day: Day, minutes: number) => void;
  onItem: (item: GridItem) => void;
  onAllDay: (eventId: string) => void;
};

/** Hours down the side, a column per day: events, time blocks (dashed), an all-day row and the now line. */
export function TimeGrid({ days, today, range, layers, areas, hourHeight, firstHour = 7, phone = false, onSlot, onItem, onAllDay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNowMinutes();
  const perDay = days.map((day) => ({ day, ...itemsForDay(range, day, layers, areas) }));
  const showAllDay = !phone && (layers.habits || perDay.some((d) => d.allDay.length));

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = firstHour * hourHeight - (phone ? 8 : 2);
    // Only on first show: later data changes keep the scroll where you left it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { calendar, format } = useT();
  const t = calendar.grid;
  const columns = { '--days': days.length, '--hour': `${hourHeight}px` } as CSSProperties;

  return (
    <section aria-label={days.length === 1 ? t.day : t.week} className={cx(styles.grid, phone && styles.gridPhone)} style={columns}>
      {!phone && (
        <div className={styles.gridHead}>
          <span />
          {days.map((day) => (
            <div key={day} className={cx(styles.dayHead, day === today && styles.dayHeadToday)}>
              <span className={styles.dayName}>
                {format.weekdaysShort[new Date(`${day}T12:00:00`).getDay()]}
                {day === today && t.todaySuffix}
              </span>
              <span className={styles.dayNumber}>{dayOfMonth(day)}</span>
            </div>
          ))}
        </div>
      )}
      {showAllDay && (
        <div className={styles.allDayRow}>
          <span className={styles.allDayLabel}>{t.allDay}</span>
          {perDay.map(({ day, allDay }) => (
            <div key={day} className={cx(styles.allDayCell, day === today && styles.todayTint)}>
              {layers.habits && range.habits[day] && (
                <span className={styles.habitCount}>
                  {t.habits(range.habits[day].done, range.habits[day].due)}
                </span>
              )}
              {allDay.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={styles.allDayChip}
                  style={toneStyle(item.tone)}
                  onClick={() => onAllDay(item.eventId)}
                  aria-label={t.allDayItem(item.title, item.calendarName)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {/* Scrolls by keyboard too. */}
      <div ref={scrollRef} className={styles.gridScroll} tabIndex={0} role="region" aria-label={t.hoursLabel}>
        <div className={styles.gridBody} style={{ height: 24 * hourHeight }}>
          <div className={styles.hours} aria-hidden="true">
            {HOURS.map((h) => (
              <span key={h} className={styles.hourLabel} style={{ top: h * hourHeight }}>
                {phone ? clockLabel(h * 60) : String(h).padStart(2, '0')}
              </span>
            ))}
          </div>
          {HOURS.slice(1).map((h) => (
            <div key={h} className={styles.hourLine} style={{ top: h * hourHeight }} aria-hidden="true" />
          ))}
          {perDay.map(({ day, timed }) => (
            <DayColumn key={day} day={day} today={today} now={now} items={timed} hourHeight={hourHeight} phone={phone} onSlot={onSlot} onItem={onItem} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DayColumn({
  day,
  today,
  now,
  items,
  hourHeight,
  phone,
  onSlot,
  onItem,
}: {
  day: Day;
  today: Day;
  now: number;
  items: ReturnType<typeof itemsForDay>['timed'];
  hourHeight: number;
  phone: boolean;
  onSlot: Props['onSlot'];
  onItem: Props['onItem'];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day}`, data: { day } });

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const top = event.currentTarget.getBoundingClientRect().top;
    onSlot(day, snapMinutes(((event.clientY - top) / hourHeight) * 60, 30));
  }

  return (
    // Clicking an empty slot is a shortcut; "New event" does the same from the keyboard.
    <div ref={setNodeRef} data-calendar-day={day} className={cx(styles.dayColumn, day === today && styles.todayTint, isOver && styles.dropTarget)} onClick={onClick}>
      {items.map((item) => (
        <Item key={item.key} item={item} hourHeight={hourHeight} phone={phone} onOpen={() => onItem(item)} />
      ))}
      {day === today && (
        <div className={styles.nowLine} style={{ top: (now / 60) * hourHeight }} aria-hidden="true">
          <span className={styles.nowDot} />
        </div>
      )}
    </div>
  );
}

function Item({ item, hourHeight, phone, onOpen }: { item: GridItem & { col: number; cols: number }; hourHeight: number; phone: boolean; onOpen: () => void }) {
  const draggable = !item.readOnly;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.kind === 'block' ? `block:${item.taskId}` : `event:${item.eventId}`,
    data: { title: item.title, minutes: item.endMin - item.startMin },
    disabled: !draggable,
  });
  const top = (item.startMin / 60) * hourHeight;
  const height = Math.max(phone ? 26 : 22, ((item.endMin - item.startMin) / 60) * hourHeight - 2);
  const short = height < 40;
  const style: CSSProperties = {
    top: top + 1,
    height,
    left: `calc(${(item.col / item.cols) * 100}% + 4px)`,
    width: `calc(${100 / item.cols}% - 8px)`,
    ...(item.tone === 'block' ? {} : { ...toneStyle(item.tone), ['--tone' as string]: `var(--${item.tone})` }),
  };
  const t = useT().calendar.grid;
  const label = `${item.title}, ${item.time}${item.kind === 'block' ? t.blockSuffix : `, ${item.calendarName}`}${item.done ? t.doneSuffix : ''}${item.readOnly ? t.readOnlySuffix : ''}`;

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cx(styles.item, item.tone === 'block' ? styles.block : styles.event, item.done && styles.done, short && styles.short, phone && styles.itemPhone, isDragging && styles.dragging)}
      style={style}
      aria-label={label}
      onClick={onOpen}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      aria-roledescription={draggable ? t.draggable : undefined}
    >
      {phone ? (
        <span className={styles.itemLine}>
          {item.title}
          <span className={styles.itemMeta}>, {item.done ? t.done : item.kind === 'block' ? t.block : item.time}</span>
        </span>
      ) : short ? (
        <span className={styles.itemLine}>
          {item.kind === 'event' && item.endMin - item.startMin <= 30 ? `${item.time.slice(0, 5)} ${item.title}` : item.title}
        </span>
      ) : (
        <>
          <span className={styles.itemTitle}>{item.title}</span>
          <span className={styles.itemMeta}>
            {item.time}
            {item.kind === 'block' && item.detail !== messages().calendar.timeBlock ? `, ${item.detail}` : ''}
          </span>
        </>
      )}
    </button>
  );
}

/** Minutes since local midnight, updated every minute. */
function useNowMinutes(): number {
  const [now, setNow] = useState(() => minutesOfDay(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(minutesOfDay(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
