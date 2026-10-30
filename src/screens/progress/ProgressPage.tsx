import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { year, type Day } from '@/domain/days';
import { periodLabel, periodRange, periodStats, shiftPeriod, type Period } from '@/domain/stats';
import { loadProgressData, loadWheelOfLife } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Segmented, StatTile } from '@/components/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { intlLocale, useT } from '@/i18n';
import { formatMinutes } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { HabitHeatmapCard } from './HabitHeatmapCard';
import { PatternsCard } from './PatternsCard';
import { WheelCard } from './WheelCard';
import { YearInPixels } from './YearInPixels';
import styles from './Progress.module.css';

const PERIODS = ['day', 'week', 'month', 'year'] as const;

export function ProgressPage() {
  const { progress: t, screens } = useT();
  const today = useToday();
  const [period, setPeriod] = useState<Period>('year');
  const [anchor, setAnchor] = useState<Day>(today);
  const data = useLiveQuery(loadProgressData);
  const wheel = useLiveQuery(loadWheelOfLife);
  const { from, to } = periodRange(period, anchor);
  const stats = data ? periodStats({ from, to, today, ...data }) : null;
  const logged = data?.entries.filter((e) => e.day >= from && e.day <= to).length ?? 0;
  const isCurrent = to >= today;

  return (
    <div className={styles.page}>
      <PageHeader
        title={screens.progress.title}
        subtitle={t.subtitle(periodLabel(period, anchor), isCurrent && period !== 'day', logged)}
        actions={
          <>
            <Segmented label={t.periodLabel} options={PERIODS.map((p) => ({ value: p, label: t.periods[p] }))} value={period} onChange={(p) => setPeriod(p)} />
            <div className={styles.stepper}>
              <button type="button" className={styles.stepButton} aria-label={t.previous[period]} onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}>
                <Icon name="chevronLeft" size={16} />
              </button>
              <span className={styles.stepLabel} aria-live="polite">
                {period === 'year' ? year(anchor) : periodLabel(period, anchor, true)}
              </span>
              <button type="button" className={styles.stepButton} aria-label={t.next[period]} disabled={isCurrent} onClick={() => setAnchor(shiftPeriod(period, anchor, 1))}>
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
          </>
        }
      />

      {stats && (
        <div className={styles.tiles}>
          <StatTile label={t.tiles.tasks} value={stats.tasksDone.toLocaleString(intlLocale())} caption={period === 'day' ? t.tiles.today : t.tiles.perDay(stats.tasksPerDay.toLocaleString(intlLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 }))} />
          <StatTile
            label={t.tiles.habits}
            value={stats.habitConsistency === null ? '–' : `${Math.round(stats.habitConsistency * 100)}%`}
            caption={stats.bestHabit ? t.tiles.best(stats.bestHabit.title, Math.round(stats.bestHabit.consistency * 100)) : t.tiles.noHabits}
          />
          <StatTile
            label={t.tiles.mood}
            value={stats.avgMood === null ? '–' : stats.avgMood.toLocaleString(intlLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
            unit={stats.avgMood === null ? undefined : '/ 5'}
            caption={stats.bestMonth ? t.tiles.bestMonth(stats.bestMonth) : stats.avgMood === null ? t.tiles.checkInToday : t.tiles.keepCheckingIn}
          />
          <StatTile
            label={t.tiles.sleep}
            value={stats.avgSleepMinutes === null ? '–' : formatMinutes(Math.round(stats.avgSleepMinutes)).replace(/(\d+)h (\d)m$/, '$1h 0$2m')}
            caption={stats.nightsOver7h === null ? t.tiles.logSleep : t.tiles.sleepTarget(Math.round(stats.nightsOver7h * 100))}
          />
          <StatTile
            label={t.tiles.reviews}
            value={stats.reviewsDone}
            unit={`/ ${stats.reviewWeeks}`}
            caption={!stats.reviewWeeks ? t.tiles.firstSunday : stats.reviewsDone === stats.reviewWeeks ? t.tiles.noneMissed : t.tiles.everyOne}
          />
        </div>
      )}

      {data && (
        <div className={styles.grid}>
          <YearInPixels year={year(anchor)} entries={data.entries} today={today} />
          {wheel && <WheelCard wheel={wheel} today={today} />}
          <HabitHeatmapCard year={year(anchor)} habits={data.habits} today={today} />
          <PatternsCard data={data} today={today} />
        </div>
      )}
    </div>
  );
}
