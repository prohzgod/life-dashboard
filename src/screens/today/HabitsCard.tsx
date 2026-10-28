import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import type { HabitDayState, HabitSummary } from '@/domain/habits';
import { listHabitsWithSummaries, tapHabit, type Habit } from '@/data';
import { Card, CheckButton } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatDayShort, plural, singular } from '@/lib/format';
import styles from './Today.module.css';

const STATE_WORDS: Record<HabitDayState, string> = {
  done: 'done',
  skipped: 'skipped',
  missed: 'missed',
  pending: 'not yet',
  off: 'rest day',
  before: 'before you started',
};

function habitMeta(habit: Habit, s: HabitSummary): string {
  const counted = habit.kind === 'count' || habit.kind === 'duration';
  if (counted && !s.todayDone) return `${s.todayValue} of ${habit.target}${habit.unit ? ` ${habit.unit}` : ''} today`;
  if (s.atRisk) return 'Missed yesterday. Today keeps the streak.';
  const pct = s.consistency === null ? null : `${Math.round(s.consistency * 100)}%`;
  if (s.streak >= 2) return s.graceUsed ? `${s.streak}-day streak, ${s.graceUsed} grace` : `${s.streak}-day streak${pct ? `, ${pct}` : ''}`;
  if (s.countedInWindow > 0) return `${s.doneInWindow} of ${plural(s.countedInWindow, 'day')}, ${pct}`;
  return s.todayDone ? 'Day one. Nicely done.' : 'Start today';
}

function checkLabel(habit: Habit, s: HabitSummary): string {
  if (s.todayDone) return `Undo today’s ${habit.title}`;
  if (habit.kind === 'count') return `Add one${habit.unit ? ` ${singular(habit.unit)}` : ''} to ${habit.title} (${s.todayValue} of ${habit.target})`;
  return `Check in ${habit.title} for today`;
}

export function HabitsCard({ today }: { today: Day }) {
  const habits = useLiveQuery(() => listHabitsWithSummaries(today), [today]);

  return (
    <Card
      title="Habits"
      meta="Never miss twice: one skipped day keeps the streak"
      className={styles.card}
      action={
        <Link to="/progress" className={styles.cardLink}>
          See trends
        </Link>
      }
    >
      {habits && habits.length === 0 && <p className={styles.quietEmpty}>No habits yet.</p>}
      <ul className={styles.habits}>
        {habits?.map(({ habit, summary }) => (
          <li key={habit.id} className={styles.habit}>
            <div className={styles.habitTop}>
              <span className={styles.habitName}>{habit.title}</span>
              <CheckButton checked={summary.todayDone} onToggle={() => void tapHabit(habit, today)} label={checkLabel(habit, summary)} size="lg">
                {habit.kind === 'count' && !summary.todayDone && summary.todayValue > 0 ? summary.todayValue : undefined}
              </CheckButton>
            </div>
            <div
              className={styles.days}
              role="img"
              aria-label={`Last 7 days: ${summary.last7.map((d) => `${formatDayShort(d.day)} ${STATE_WORDS[d.state]}`).join(', ')}`}
            >
              {summary.last7.map((d) => (
                <span key={d.day} className={cx(styles.dayCell, styles[`day-${d.state}`])} />
              ))}
            </div>
            <span className={styles.habitMeta}>{habitMeta(habit, summary)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
