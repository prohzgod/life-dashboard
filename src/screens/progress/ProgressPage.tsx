import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { year, type Day } from '@/domain/days';
import { periodLabel, periodRange, periodStats, shiftPeriod, type Period } from '@/domain/stats';
import { loadProgressData, loadWheelOfLife } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Segmented, StatTile } from '@/components/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { formatMinutes, plural } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { HabitHeatmapCard } from './HabitHeatmapCard';
import { PatternsCard } from './PatternsCard';
import { WheelCard } from './WheelCard';
import { YearInPixels } from './YearInPixels';
import styles from './Progress.module.css';

const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

export function ProgressPage() {
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
        title="Progress"
        subtitle={`${periodLabel(period, anchor)}${isCurrent && period !== 'day' ? ' so far' : ''} · ${plural(logged, 'day')} logged · computed on this device`}
        actions={
          <>
            <Segmented label="Period" options={PERIODS} value={period} onChange={(p) => setPeriod(p)} />
            <div className={styles.stepper}>
              <button type="button" className={styles.stepButton} aria-label={`Previous ${period}`} onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}>
                <Icon name="chevronLeft" size={16} />
              </button>
              <span className={styles.stepLabel} aria-live="polite">
                {period === 'year' ? year(anchor) : periodLabel(period, anchor).replace(/^Week \d+ · /, '')}
              </span>
              <button type="button" className={styles.stepButton} aria-label={`Next ${period}`} disabled={isCurrent} onClick={() => setAnchor(shiftPeriod(period, anchor, 1))}>
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
          </>
        }
      />

      {stats && (
        <div className={styles.tiles}>
          <StatTile label="Tasks completed" value={stats.tasksDone.toLocaleString()} caption={period === 'day' ? 'today' : `about ${stats.tasksPerDay.toFixed(1)} per day`} />
          <StatTile
            label="Habit consistency"
            value={stats.habitConsistency === null ? '–' : `${Math.round(stats.habitConsistency * 100)}%`}
            caption={stats.bestHabit ? `best: ${stats.bestHabit.title.toLowerCase()}, ${Math.round(stats.bestHabit.consistency * 100)}%` : 'no habit days yet'}
          />
          <StatTile
            label="Average mood"
            value={stats.avgMood === null ? '–' : stats.avgMood.toFixed(1)}
            unit={stats.avgMood === null ? undefined : '/ 5'}
            caption={stats.bestMonth ? `best month: ${stats.bestMonth}` : stats.avgMood === null ? 'check in on Today' : 'keep checking in'}
          />
          <StatTile
            label="Average sleep"
            value={stats.avgSleepMinutes === null ? '–' : formatMinutes(Math.round(stats.avgSleepMinutes)).replace(/(\d+)h (\d)m$/, '$1h 0$2m')}
            caption={stats.nightsOver7h === null ? 'log sleep in your check-in' : `target 7h · met ${Math.round(stats.nightsOver7h * 100)}% of nights`}
          />
          <StatTile
            label="Weekly reviews"
            value={stats.reviewsDone}
            unit={`/ ${stats.reviewWeeks}`}
            caption={!stats.reviewWeeks ? 'your first is on Sunday' : stats.reviewsDone === stats.reviewWeeks ? 'none missed' : 'every one counts'}
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
