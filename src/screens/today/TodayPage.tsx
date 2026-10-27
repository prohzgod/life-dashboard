import { useLiveQuery } from 'dexie-react-hooks';
import { dayOfYear, daysInYear, isoWeek, year } from '@/domain/days';
import { isDueToday } from '@/domain/tasks';
import { tasksRepo } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { ButtonLink } from '@/components/ui';
import { formatDayLong, numberWord } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { AgendaCard } from './AgendaCard';
import { CheckInCard } from './CheckInCard';
import { FocusCard } from './FocusCard';
import { HabitsCard } from './HabitsCard';
import { OnThisDayCard } from './OnThisDayCard';
import { PlanCard } from './PlanCard';
import styles from './Today.module.css';

function greeting(hour: number) {
  if (hour < 5) return 'Good evening.';
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

function headline(open: number | undefined) {
  if (open === undefined) return '';
  if (open === 0) return 'A clear day.';
  if (open === 1) return 'One thing matters today.';
  return `${numberWord(open)} things matter today.`;
}

export function TodayPage() {
  const today = useToday();
  const open = useLiveQuery(async () => (await tasksRepo.list((t) => isDueToday(t, today))).length, [today]);
  const day = dayOfYear(today);
  const percent = Math.round((day / daysInYear(year(today))) * 100);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{formatDayLong(today)}</span>
          <h1 className={styles.title}>
            {greeting(new Date().getHours())} {headline(open)}
          </h1>
        </div>
        <div className={styles.headerSide}>
          <div className={styles.year}>
            <div className={styles.yearText}>
              <span>
                {year(today)} · week {isoWeek(today)}
              </span>
              <span>
                Day {day} · {percent}%
              </span>
            </div>
            <div
              className={styles.yearTrack}
              role="progressbar"
              aria-label="Year so far"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className={styles.yearFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
          <ButtonLink to="/tasks?view=anytime" icon={<Icon name="calendar" size={16} />}>
            Plan my day
          </ButtonLink>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.column}>
          <AgendaCard />
          <PlanCard today={today} />
          <HabitsCard today={today} />
        </div>
        <div className={styles.column}>
          <CheckInCard today={today} />
          <FocusCard today={today} />
          <OnThisDayCard today={today} />
        </div>
      </div>
    </div>
  );
}
