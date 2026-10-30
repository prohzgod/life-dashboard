import { useLiveQuery } from 'dexie-react-hooks';
import { dayOfYear, daysInYear, isoWeek, year } from '@/domain/days';
import { isDueToday } from '@/domain/tasks';
import { tasksRepo } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { ButtonLink } from '@/components/ui';
import { formatDayLong, numberWord } from '@/lib/format';
import { useT, type Messages } from '@/i18n';
import { useToday } from '@/lib/useToday';
import { AgendaCard } from './AgendaCard';
import { CheckInCard } from './CheckInCard';
import { FocusCard } from './FocusCard';
import { HabitsCard } from './HabitsCard';
import { OnThisDayCard } from './OnThisDayCard';
import { PlanCard } from './PlanCard';
import { useIsMobile } from '@/lib/useMediaQuery';
import { MobileToday } from './MobileToday';
import styles from './Today.module.css';

function greeting(t: Messages['today'], hour: number) {
  if (hour < 5) return t.greeting.night;
  if (hour < 12) return t.greeting.morning;
  if (hour < 18) return t.greeting.afternoon;
  return t.greeting.evening;
}

function headline(t: Messages['today'], open: number | undefined) {
  if (open === undefined) return '';
  if (open === 0) return t.headline.clear;
  if (open === 1) return t.headline.one;
  return t.headline.many(numberWord(open));
}

export function TodayPage() {
  return useIsMobile() ? <MobileToday /> : <DesktopToday />;
}

function DesktopToday() {
  const t = useT().today;
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
            {greeting(t, new Date().getHours())} {headline(t, open)}
          </h1>
        </div>
        <div className={styles.headerSide}>
          {/* The page's one field: how much of the year is behind you, set large. */}
          <div className={styles.year}>
            <span className={styles.yearFigure}>{percent}%</span>
            <span className={styles.yearText}>
              <span>{t.yearGone(year(today))}</span>
              <span>{t.dayWeek(day, isoWeek(today))}</span>
            </span>
            <div
              className={styles.yearTrack}
              role="progressbar"
              aria-label={t.yearSoFar}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className={styles.yearFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
          <ButtonLink to="/tasks?view=anytime" icon={<Icon name="calendar" size={16} />}>
            {t.planMyDay}
          </ButtonLink>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.column}>
          <AgendaCard today={today} />
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
