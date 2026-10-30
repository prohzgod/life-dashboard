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
import { messages, useT } from '@/i18n';
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
  const t = useT().calendar.sidebar;
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
    <aside aria-label={t.label} className={styles.side}>
      <MiniMonth shown={shownMonth} anchor={anchor} today={today} highlight={highlight} onPick={onPickDay} onShift={(dir) => setShownMonth(addMonths(shownMonth, dir))} />

      <section className={styles.sideSection} aria-labelledby="calendars-label">
        <h2 id="calendars-label" className={styles.sideLabel}>
          {t.calendars}
        </h2>
        {calendars.map((c) => (
          <div key={c.id} className={styles.calendarRow}>
            <label className={styles.calendarCheck}>
              <input type="checkbox" checked={c.visible} onChange={(e) => setCalendarVisible(c.id, e.target.checked)} style={{ accentColor: `var(--${c.color})` }} />
              <span className={styles.calendarName}>{c.name}</span>
            </label>
            <span className={styles.calendarKind}>{c.source === 'local' ? t.local : t.readOnly}</span>
            <button type="button" className={styles.iconButton} aria-label={t.settings(c.name)} onClick={() => onCalendarSettings(c)}>
              <Icon name="more" size={16} />
            </button>
          </div>
        ))}
        <label className={styles.calendarCheck}>
          <input type="checkbox" checked={layers.blocks} onChange={(e) => onLayers({ ...layers, blocks: e.target.checked })} />
          <span className={styles.calendarName}>{t.blocks}</span>
        </label>
        <label className={styles.calendarCheck}>
          <input type="checkbox" checked={layers.habits} onChange={(e) => onLayers({ ...layers, habits: e.target.checked })} />
          <span className={styles.calendarName}>{t.habits}</span>
        </label>
        <button type="button" className={styles.addCalendar} onClick={onAddCalendar}>
          <Icon name="plus" size={14} />
          {t.add}
        </button>
      </section>

      <section className={styles.sideSection} aria-labelledby="unscheduled-label">
        <div className={styles.sideLabelRow}>
          <h2 id="unscheduled-label" className={styles.sideLabel}>
            {t.unscheduled}
          </h2>
          <span className={styles.sideHint}>{t.dragHint}</span>
        </div>
        {range && range.unscheduled.length === 0 && <p className={styles.sideEmpty}>{t.unscheduledEmpty}</p>}
        <ul className={styles.unscheduled}>
          {range?.unscheduled.map((task) => (
            <UnscheduledTask key={task.id} task={task} onSchedule={() => onScheduleTask(task)} />
          ))}
        </ul>
      </section>

      <div className={styles.sideFill} />
      <p className={styles.sideNote}>
        {imported.length
          ? t.importedNote(imported.map((c) => c.name).join(', '), latest ? timeAgo(latest) : null)
          : t.localNote}
      </p>
    </aside>
  );
}

function UnscheduledTask({ task, onSchedule }: { task: Task; onSchedule: () => void }) {
  const t = useT().calendar.sidebar;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task:${task.id}`, data: { title: task.title, minutes: task.estimateMin ?? 30 } });
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        className={cx(styles.taskChip, isDragging && styles.dragging)}
        onClick={onSchedule}
        aria-label={t.putOn(`${task.title}${task.estimateMin ? `, ${formatMinutes(task.estimateMin)}` : ''}`)}
        {...listeners}
        {...attributes}
        aria-roledescription={t.draggableTask}
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
  return m < 60 ? messages().calendar.sidebar.shortMinutes(m) : formatMinutes(m);
}
