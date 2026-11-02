import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import type { HabitSummary } from '@/domain/habits';
import { listHabitsWithSummaries, tapHabit } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { AnimatedNumber, Card, CheckButton, IconButton, WeekDots, type DotState } from '@/components/ui';
import { Ring } from '@/components/ui/Ring';
import { cx } from '@/components/ui/cx';
import { messages, useT } from '@/i18n';
import { formatDayShort } from '@/lib/format';
import { habitCheckLabel } from '@/lib/habitText';
import { dayToDate } from '@/domain/days';
import styles from './Today.module.css';

function habitMeta(s: HabitSummary): string {
  const t = messages().today.habits;
  const pct = s.consistency === null ? null : `${Math.round(s.consistency * 100)}%`;
  if (s.streak >= 2) return s.graceUsed ? t.streakGrace(s.streak, s.graceUsed) : t.streak(s.streak, pct);
  if (s.countedInWindow > 0) return t.window(s.doneInWindow, s.countedInWindow, pct);
  return s.todayDone ? t.dayOne : t.start;
}

function dotState(state: HabitSummary['last7'][number]['state'], isToday: boolean): DotState {
  if (isToday) return state === 'done' ? 'todayDone' : 'today';
  if (state === 'done') return 'done';
  if (state === 'missed') return 'missed';
  if (state === 'skipped') return 'open';
  return 'future';
}

/** Habits as tiles: a check (or + for counted ones), the last seven days, and a kind word when a streak is at risk. */
export function HabitsCard({ today, compact = false, className }: { today: Day; compact?: boolean; className?: string }) {
  const t = useT().today.habits;
  const { format } = useT();
  const habits = useLiveQuery(() => listHabitsWithSummaries(today), [today]);

  return (
    <Card
      title={t.title}
      meta={compact ? undefined : t.short}
      className={cx(styles.habitsCard, compact && styles.habitsCompact, className)}
      action={
        <Link to="/progress" className={styles.pillLink}>
          <span className={styles.pillText}>{t.trends}</span>
          <Icon name="arrowUpRight" size={16} strokeWidth={2} />
        </Link>
      }
    >
      {habits && habits.length === 0 && <p className={styles.quietEmpty}>{t.empty}</p>}
      <ul className={styles.habitTiles}>
        {habits?.map(({ habit, summary }) => {
          const counted = habit.kind === 'count' || habit.kind === 'duration';
          const label = habitCheckLabel(habit, summary, counted);
          return (
            <li key={habit.id} className={styles.habitTile}>
              <div className={styles.habitTop}>
                <div className={styles.habitText}>
                  <h3 className={styles.habitName}>{habit.title}</h3>
                  <p className={styles.habitMeta}>{habitMeta(summary)}</p>
                </div>
                {counted && !summary.todayDone ? (
                  <IconButton icon="plus" tone="inverse" label={label} className={styles.habitAdd} onClick={() => void tapHabit(habit, today)} />
                ) : (
                  <CheckButton checked={summary.todayDone} onToggle={() => void tapHabit(habit, today)} label={label} size="lg" />
                )}
              </div>
              {counted ? (
                <div className={styles.habitCount}>
                  <Ring percent={summary.todayDone ? 100 : (summary.todayValue / habit.target) * 100} size={56} stroke={8} color="var(--accent)" label={t.ofTarget(summary.todayValue, habit.target)} />
                  <span className={styles.numeralM}>
                    <AnimatedNumber value={summary.todayValue} />
                    <small> / {habit.target}</small>
                  </span>
                </div>
              ) : (
                <WeekDots
                  days={summary.last7.map((d) => ({ key: d.day, letter: format.weekdaysShort[dayToDate(d.day).getDay()]!, state: dotState(d.state, d.day === today) }))}
                  label={t.last7(summary.last7.map((d) => `${formatDayShort(d.day)} ${t.states[d.state]}`).join(', '))}
                />
              )}
              {summary.atRisk && <p className={styles.habitRisk}>{t.atRisk}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
