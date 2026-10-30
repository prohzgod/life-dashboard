import { dayOfMonth, dayToDate, isoWeek } from '@/domain/days';
import { rangeLabel } from '@/domain/calendar';
import { Icon } from '@/components/icons/Icon';
import { Segmented } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatDayShort, timeAgo } from '@/lib/format';
import type { CalendarScreen } from './CalendarPage';
import { itemsForDay, monthTitle, stepAnchor, viewRange } from './items';
import { MonthGrid } from './MonthViews';
import { TimeGrid } from './TimeGrid';
import { useT } from '@/i18n';
import styles from './Calendar.module.css';

/** The phone calendar: a strip of the week's days over one day's timeline; week as a list; month as dots. */
export function MobileCalendar({ view, anchor, today, range, layers, areas, go, openItem, openAllDay, newEvent, hourHeight }: CalendarScreen & { hourHeight: number }) {
  const tc = useT().calendar;
  const t = tc.phone;
  const week = viewRange('week', anchor).days;
  const imported = range?.calendars.filter((c) => c.source === 'ics' && c.visible) ?? [];
  const latest = imported.map((c) => c.lastSyncedAt).filter(Boolean).sort().at(-1);
  const habits = range?.habits[anchor];

  return (
    <div className={styles.phone}>
      <header className={styles.phoneHeader}>
        <div className={styles.phoneHeading}>
          <span className={styles.phoneEyebrow}>{t.eyebrow(isoWeek(anchor))}</span>
          <h1 className={styles.phoneTitle}>{tc.monthName(dayToDate(anchor))}</h1>
        </div>
        <button type="button" className={styles.roundButton} aria-label={tc.newEvent} onClick={() => newEvent(view === 'day' ? { day: anchor, startMin: 9 * 60 } : undefined)}>
          <Icon name="plus" size={20} />
        </button>
      </header>

      <Segmented
        label={tc.viewLabel}
        className={styles.phoneTabs}
        value={view === 'year' ? 'month' : view}
        onChange={(v) => go(v, anchor)}
        options={(['day', 'week', 'month'] as const).map((v) => ({ value: v, label: tc.views[v] }))}
      />

      {(view === 'week' || view === 'month') && (
        <div className={styles.phoneNav}>
          <button type="button" className={styles.stepButton} aria-label={tc.previous[view]} onClick={() => go(view, stepAnchor(view, anchor, -1))}>
            <Icon name="chevronLeft" size={16} />
          </button>
          <span className={styles.phoneNavLabel}>{view === 'week' ? rangeLabel(week[0]!, week[6]!) : monthTitle(anchor)}</span>
          <button type="button" className={styles.stepButton} aria-label={tc.next[view]} onClick={() => go(view, stepAnchor(view, anchor, 1))}>
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      )}

      {view !== 'month' && range && (
        <div className={styles.strip} role="group" aria-label={t.daysThisWeek}>
          {week.map((day) => {
            const { timed, allDay } = itemsForDay(range, day, layers, areas);
            const count = Math.min(3, timed.length + allDay.length);
            return (
              <button
                key={day}
                type="button"
                className={cx(styles.stripDay, day === anchor && styles.stripDaySelected)}
                aria-pressed={day === anchor}
                aria-current={day === today ? 'date' : undefined}
                aria-label={t.dayCount(formatDayShort(day), count ? timed.length + allDay.length : 0)}
                onClick={() => go('day', day)}
              >
                <span className={styles.stripInitial}>{t.initials[new Date(`${day}T12:00:00`).getDay()]}</span>
                <span className={styles.stripNumber}>{dayOfMonth(day)}</span>
                <span className={styles.stripDots} aria-hidden="true">
                  {Array.from({ length: count }, (_, i) => (
                    <span key={i} className={styles.stripDot} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {view === 'day' && (
        <div className={styles.phoneMeta}>
          {layers.habits && habits && (
            <span className={styles.metaChip}>
              {t.habits(habits.done, habits.due)}
            </span>
          )}
          <span className={styles.metaText}>{imported.length ? t.importedNote(imported[0]!.name, latest ? timeAgo(latest) : null) : t.saved}</span>
        </div>
      )}

      {range && view === 'day' && (
        <>
          {itemsForDay(range, anchor, layers, areas).allDay.map((item) => (
            <button key={item.key} type="button" className={styles.phoneAllDay} onClick={() => openAllDay(item.eventId)} style={{ background: `var(--${item.tone}-soft)`, color: `var(--${item.tone}-ink)` }}>
              {item.title}
              <span className={styles.itemMeta}>{t.allDaySuffix}</span>
            </button>
          ))}
          <TimeGrid days={[anchor]} today={today} range={range} layers={layers} areas={areas} hourHeight={hourHeight} phone onSlot={(day, startMin) => newEvent({ day, startMin })} onItem={openItem} onAllDay={openAllDay} />
        </>
      )}

      {range && view === 'week' && (
        <ol className={styles.weekList}>
          {week.map((day) => {
            const { timed, allDay } = itemsForDay(range, day, layers, areas);
            return (
              <li key={day} className={styles.weekDay}>
                <h2 className={cx(styles.weekDayTitle, day === today && styles.weekDayToday)}>
                  <button type="button" onClick={() => go('day', day)}>
                    {day === today ? t.todayDate(formatDayShort(day)) : formatDayShort(day)}
                  </button>
                </h2>
                {timed.length + allDay.length === 0 ? (
                  <p className={styles.weekEmpty}>{t.nothing}</p>
                ) : (
                  <ul className={styles.weekItems}>
                    {allDay.map((a) => (
                      <li key={a.key}>
                        <button type="button" className={styles.weekItem} onClick={() => openAllDay(a.eventId)}>
                          <span className={styles.weekTime}>{t.allDay}</span>
                          <span className={styles.weekBar} style={{ background: `var(--${a.tone})` }} aria-hidden="true" />
                          {a.title}
                        </button>
                      </li>
                    ))}
                    {[...timed]
                      .sort((a, b) => a.startMin - b.startMin)
                      .map((t) => (
                        <li key={t.key}>
                          <button type="button" className={cx(styles.weekItem, t.done && styles.done)} onClick={() => openItem(t)}>
                            <span className={styles.weekTime}>{t.time.slice(0, 5)}</span>
                            <span className={cx(styles.weekBar, t.tone === 'block' && styles.weekBarBlock)} style={t.tone === 'block' ? undefined : { background: `var(--${t.tone})` }} aria-hidden="true" />
                            {t.title}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {range && view === 'month' && <MonthGrid anchor={anchor} today={today} range={range} layers={layers} areas={areas} phone onPickDay={(day) => go('day', day)} />}
    </div>
  );
}

