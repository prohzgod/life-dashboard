import { addDays, dayOfMonth, month, startOfWeek, type Day } from '@/domain/days';
import { monthGrid } from '@/domain/calendar';
import { useT } from '@/i18n';
import type { CalendarRange, LifeArea } from '@/data';
import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/icons/Icon';
import { daysWithItems, itemsForDay, monthTitle, toneStyle, type Layers } from './items';
import styles from './Calendar.module.css';

/** The small month in the sidebar: pick a day; the shown week is shaded. */
export function MiniMonth({ shown, anchor, today, highlight, onPick, onShift }: { shown: Day; anchor: Day; today: Day; highlight: Day[]; onPick: (day: Day) => void; onShift: (dir: 1 | -1) => void }) {
  const { calendar, format } = useT();
  const t = calendar.month;
  const days = monthGrid(shown);
  const inMonth = (d: Day) => month(d) === month(shown);
  return (
    <div className={styles.mini}>
      <div className={styles.miniHead}>
        <span className={styles.miniTitle}>{monthTitle(shown)}</span>
        <span className={styles.miniNav}>
          <button type="button" aria-label={t.previous} onClick={() => onShift(-1)}>
            <Icon name="chevronLeft" size={14} />
          </button>
          <button type="button" aria-label={t.next} onClick={() => onShift(1)}>
            <Icon name="chevronRight" size={14} />
          </button>
        </span>
      </div>
      <div className={styles.miniGrid} role="group" aria-label={monthTitle(shown)}>
        {t.initials.map((d, i) => (
          <span key={i} className={styles.miniWeekday} aria-hidden="true">
            {d}
          </span>
        ))}
        {days.filter((_, i) => days.slice(i - (i % 7), i - (i % 7) + 7).some(inMonth)).map((day) => {
          const inWeek = highlight.includes(day);
          return (
            <button
              key={day}
              type="button"
              className={cx(styles.miniDay, !inMonth(day) && styles.miniOut, inWeek && styles.miniWeek, inWeek && day === highlight[0] && styles.miniWeekStart, inWeek && day === highlight.at(-1) && styles.miniWeekEnd, day === anchor && styles.miniAnchor)}
              aria-current={day === today ? 'date' : undefined}
              aria-pressed={day === anchor}
              aria-label={t.dayLabel(dayOfMonth(day), format.monthsLong[month(day) - 1]!)}
              onClick={() => onPick(day)}
            >
              {dayOfMonth(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Six weeks of days with up to three items each. */
export function MonthGrid({ anchor, today, range, layers, areas, phone, onPickDay }: { anchor: Day; today: Day; range: CalendarRange; layers: Layers; areas: readonly LifeArea[]; phone?: boolean; onPickDay: (day: Day) => void }) {
  const { calendar, format } = useT();
  const t = calendar.month;
  const days = monthGrid(anchor);
  return (
    <section aria-label={t.monthLabel(monthTitle(anchor))} className={cx(styles.month, phone && styles.monthPhone)}>
      <div className={styles.monthHead} aria-hidden="true">
        {(phone ? t.initials : t.names).map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className={styles.monthBody}>
        {days.map((day) => {
          const { timed, allDay } = itemsForDay(range, day, layers, areas);
          const entries = [...allDay.map((a) => ({ key: a.key, title: a.title, tone: a.tone as string, time: '' })), ...timed.sort((a, b) => a.startMin - b.startMin).map((t) => ({ key: t.key, title: t.title, tone: t.tone, time: t.time.slice(0, 5) }))];
          const label = `${t.dayLabel(dayOfMonth(day), format.monthsLong[month(day) - 1]!)}${entries.length ? t.items(entries.length) : ''}`;
          return (
            <button key={day} type="button" className={cx(styles.monthDay, month(day) !== month(anchor) && styles.monthOut, day === today && styles.monthToday)} aria-label={label} onClick={() => onPickDay(day)}>
              <span className={styles.monthNumber}>{dayOfMonth(day)}</span>
              {phone ? (
                <span className={styles.dots} aria-hidden="true">
                  {entries.slice(0, 3).map((e) => (
                    <span key={e.key} className={styles.dot} />
                  ))}
                </span>
              ) : (
                <span className={styles.monthItems} aria-hidden="true">
                  {entries.slice(0, 3).map((e) => (
                    <span key={e.key} className={cx(styles.monthChip, e.tone === 'block' && styles.monthBlock)} style={e.tone === 'block' ? undefined : toneStyle(e.tone)}>
                      {e.time && <span className={styles.monthTime}>{e.time}</span>} {e.title}
                    </span>
                  ))}
                  {entries.length > 3 && <span className={styles.more}>{t.more(entries.length - 3)}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Twelve small months; a dot marks days with something on them. */
export function YearGrid({ anchor, today, range, layers, onPickDay }: { anchor: Day; today: Day; range: CalendarRange; layers: Layers; onPickDay: (day: Day) => void }) {
  const y = anchor.slice(0, 4);
  const { calendar, format } = useT();
  const t = calendar.month;
  const busy = daysWithItems(range, layers);
  return (
    <section aria-label={t.yearLabel(y)} className={styles.year}>
      {format.monthsLong.map((name, i) => {
        const first = `${y}-${String(i + 1).padStart(2, '0')}-01`;
        const start = startOfWeek(first);
        const days = Array.from({ length: 42 }, (_, k) => addDays(start, k)).filter((d, k) => k < 35 || month(d) === i + 1);
        return (
          <div key={name} className={styles.yearMonth}>
            <h2 className={styles.yearMonthTitle}>{name}</h2>
            <div className={styles.miniGrid}>
              {t.initials.map((d, k) => (
                <span key={k} className={styles.miniWeekday} aria-hidden="true">
                  {d}
                </span>
              ))}
              {days.map((day) =>
                month(day) !== i + 1 ? (
                  <span key={day} />
                ) : (
                  <button
                    key={day}
                    type="button"
                    className={cx(styles.yearDay, day === today && styles.miniAnchor)}
                    aria-current={day === today ? 'date' : undefined}
                    aria-label={t.dayLabel(dayOfMonth(day), name)}
                    onClick={() => onPickDay(day)}
                  >
                    {dayOfMonth(day)}
                    {busy.has(day) && <span className={styles.yearDot} aria-hidden="true" />}
                  </button>
                ),
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
