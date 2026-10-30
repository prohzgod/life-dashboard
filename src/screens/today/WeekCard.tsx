import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, dayToDate, isoWeek, startOfWeek, type Day } from '@/domain/days';
import { doneByDay } from '@/domain/tasks';
import { tasksRepo } from '@/data';
import { ArrowLink, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import { withCompletedOn } from '@/lib/taskView';
import styles from './Today.module.css';

/** Tasks done each day this week: strong bars, today in the accent with its count, the days ahead as dots. */
export function WeekCard({ today, className }: { today: Day; className?: string }) {
  const t = useT().today.week;
  const { format } = useT();
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  const counts = useLiveQuery(async () => doneByDay(withCompletedOn(await tasksRepo.list()), days), [today]);
  if (!counts) return null;
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  const letter = (day: Day) => format.weekdaysShort[dayToDate(day).getDay()]!;

  return (
    <Card title={t.title} className={className} action={<ArrowLink to="/progress" label={t.open} />}>
      <p className={styles.weekTotal}>
        <span className={styles.numeralL}>{total}</span>
        <span>{t.done(isoWeek(today))}</span>
      </p>
      <ol className={styles.weekBars} aria-label={t.bars(days.map((d, i) => `${letter(d)} ${counts[i]}`).join(', '))}>
        {days.map((day, i) => {
          const future = day > today;
          const isToday = day === today;
          return (
            <li key={day} className={cx(styles.weekDay, isToday && styles.weekToday)} aria-hidden="true">
              <span className={styles.weekBarWrap}>
                {isToday && <span className={styles.weekPill}>{t.today(counts[i]!)}</span>}
                {future ? <span className={styles.weekFuture} /> : <span className={styles.weekBar} style={{ height: `${Math.max(10, (counts[i]! / max) * 100)}%` }} />}
              </span>
              {letter(day)}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
