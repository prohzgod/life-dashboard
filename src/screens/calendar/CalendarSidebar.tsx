import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { addMonths, firstOfMonth } from '@/domain/calendar';
import type { Day } from '@/domain/days';
import { setCalendarVisible, type Calendar, type CalendarRange, type Task } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { formatMinutes, timeAgo } from '@/lib/format';
import type { Layers } from './items';
import { MiniMonth } from './MonthViews';
import styles from './Calendar.module.css';

type Props = {
  anchor: Day;
  today: Day;
  highlight: Day[];
  range: CalendarRange | undefined;
  layers: Layers;
  onLayers: (layers: Layers) => void;
  onPickDay: (day: Day) => void;
  onAddCalendar: () => void;
  onCalendarSettings: (calendar: Calendar) => void;
  onScheduleTask: (task: Task) => void;
};

export function CalendarSidebar({ anchor, today, highlight, range, layers, onLayers, onPickDay, onAddCalendar, onCalendarSettings, onScheduleTask }: Props) {
  const [shownMonth, setShownMonth] = useState(() => firstOfMonth(anchor));
  // Follow the main view when it moves to another month.
  const [lastAnchor, setLastAnchor] = useState(anchor);
  if (anchor !== lastAnchor) {
    setLastAnchor(anchor);
    setShownMonth(firstOfMonth(anchor));
  }
  const calendars = range?.calendars ?? [];
  const imported = calendars.filter((c) => c.source === 'ics');
  const latest = imported.map((c) => c.lastSyncedAt).filter(Boolean).sort().at(-1);

  return (
    <aside aria-label="Calendar options" className={styles.side}>
      <MiniMonth shown={shownMonth} anchor={anchor} today={today} highlight={highlight} onPick={onPickDay} onShift={(dir) => setShownMonth(addMonths(shownMonth, dir))} />

      <section className={styles.sideSection} aria-labelledby="calendars-label">
        <h2 id="calendars-label" className={styles.sideLabel}>
          Calendars
        </h2>
        {calendars.map((c) => (
          <div key={c.id} className={styles.calendarRow}>
            <label className={styles.calendarCheck}>
              <input type="checkbox" checked={c.visible} onChange={(e) => setCalendarVisible(c.id, e.target.checked)} style={{ accentColor: `var(--${c.color})` }} />
              <span className={styles.calendarName}>{c.name}</span>
            </label>
            <span className={styles.calendarKind}>{c.source === 'local' ? 'local' : 'read-only'}</span>
            <button type="button" className={styles.iconButton} aria-label={`${c.name} settings`} onClick={() => onCalendarSettings(c)}>
              <Icon name="more" size={16} />
            </button>
          </div>
        ))}
        <label className={styles.calendarCheck}>
          <input type="checkbox" checked={layers.blocks} onChange={(e) => onLayers({ ...layers, blocks: e.target.checked })} />
          <span className={styles.calendarName}>Time blocks (tasks)</span>
        </label>
        <label className={styles.calendarCheck}>
          <input type="checkbox" checked={layers.habits} onChange={(e) => onLayers({ ...layers, habits: e.target.checked })} />
          <span className={styles.calendarName}>Habits</span>
        </label>
        <button type="button" className={styles.addCalendar} onClick={onAddCalendar}>
          <Icon name="plus" size={14} />
          Add a calendar
        </button>
      </section>

      <section className={styles.sideSection} aria-labelledby="unscheduled-label">
        <div className={styles.sideLabelRow}>
          <h2 id="unscheduled-label" className={styles.sideLabel}>
            Unscheduled
          </h2>
          <span className={styles.sideHint}>drag onto the week</span>
        </div>
        {range && range.unscheduled.length === 0 && <p className={styles.sideEmpty}>Open tasks without a time show here, ready to drag onto a day.</p>}
        <ul className={styles.unscheduled}>
          {range?.unscheduled.map((task) => (
            <UnscheduledTask key={task.id} task={task} onSchedule={() => onScheduleTask(task)} />
          ))}
        </ul>
      </section>

      <div className={styles.sideFill} />
      <p className={styles.sideNote}>
        {imported.length
          ? `${imported.map((c) => c.name).join(', ')} ${latest ? `read ${timeAgo(latest)}` : 'imported'}. Imported calendars are read-only; refresh them from their settings.`
          : 'Everything here stays on this device and works offline. Add a calendar to see your other events beside your plans.'}
      </p>
    </aside>
  );
}

function UnscheduledTask({ task, onSchedule }: { task: Task; onSchedule: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task:${task.id}`, data: { title: task.title, minutes: task.estimateMin ?? 30 } });
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        className={cx(styles.taskChip, isDragging && styles.dragging)}
        onClick={onSchedule}
        aria-label={`${task.title}${task.estimateMin ? `, ${formatMinutes(task.estimateMin)}` : ''}. Put on the calendar`}
        {...listeners}
        {...attributes}
        aria-roledescription="draggable task"
      >
        <span className={styles.grip} aria-hidden="true">
          <Icon name="grip" size={14} />
        </span>
        <span className={styles.taskChipTitle}>{task.title}</span>
        {task.estimateMin && <span className={styles.taskChipTime}>{shortMinutes(task.estimateMin)}</span>}
      </button>
    </li>
  );
}

/** "45m", "1h", "1h 30m" */
function shortMinutes(m: number): string {
  return m < 60 ? `${m}m` : formatMinutes(m);
}
