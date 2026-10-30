import { Link } from 'react-router-dom';
import { yearPixels } from '@/domain/stats';
import type { DayEntryLike } from '@/domain/review';
import type { Day } from '@/domain/days';
import { Card } from '@/components/ui';
import { formatDayShort } from '@/lib/format';
import { useT } from '@/i18n';
import styles from './Progress.module.css';

/** One square per day, coloured by mood. A day with a check-in opens its journal page. */
export function YearInPixels({ year, entries, today }: { year: number; entries: DayEntryLike[]; today: Day }) {
  const { format, progress, today: todayText } = useT();
  const t = progress.pixels;
  const MONTHS = format.monthsShort;
  const MOODS = todayText.checkIn.moods;
  const grid = yearPixels(year, entries);
  return (
    <Card title={t.title} meta={t.meta} className={styles.wide}>
      <div className={styles.pixels} role="grid" aria-label={t.label(year)}>
        {grid.map((row, m) => (
          <div key={m} role="row" className={styles.pixelRow}>
            <span role="rowheader" className={styles.pixelMonth}>
              <span className="visually-hidden">{MONTHS[m]}</span>
              <span aria-hidden="true" className={styles.monthFull}>{MONTHS[m]}</span>
              <span aria-hidden="true" className={styles.monthShort}>{t.monthInitial(m)}</span>
            </span>
            {row.map((cell, d) => {
              if (!cell) return <span key={d} className={styles.pixelGap} aria-hidden="true" />;
              const label = `${formatDayShort(cell.day)}: ${cell.mood ? MOODS[cell.mood - 1] : cell.day > today ? t.toCome : t.noCheckIn}`;
              const className = `${styles.pixel} ${cell.mood ? styles[`mood${cell.mood}`] : cell.day > today ? styles.future : ''}`;
              return cell.mood ? (
                <Link key={d} role="gridcell" to={`/library/day/${cell.day}`} className={className} aria-label={label} title={label} />
              ) : (
                <span key={d} role="gridcell" className={className} aria-label={label} title={label} />
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.legend} aria-hidden="true">
        {MOODS.map((m, i) => (
          <span key={m} className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles[`mood${i + 1}`]}`} />
            {m}
          </span>
        ))}
      </div>
    </Card>
  );
}
