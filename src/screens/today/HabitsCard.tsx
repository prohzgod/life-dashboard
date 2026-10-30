import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import type { HabitSummary } from '@/domain/habits';
import { listHabitsWithSummaries, tapHabit, type Habit } from '@/data';
import { Card, CheckButton } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { messages, useT } from '@/i18n';
import { formatDayShort } from '@/lib/format';
import { habitCheckLabel } from '@/lib/habitText';
import styles from './Today.module.css';

function habitMeta(habit: Habit, s: HabitSummary): string {
  const t = messages().today.habits;
  const counted = habit.kind === 'count' || habit.kind === 'duration';
  if (counted && !s.todayDone) return t.ofToday(s.todayValue, habit.target, habit.unit ?? '');
  if (s.atRisk) return t.atRisk;
  const pct = s.consistency === null ? null : `${Math.round(s.consistency * 100)}%`;
  if (s.streak >= 2) return s.graceUsed ? t.streakGrace(s.streak, s.graceUsed) : t.streak(s.streak, pct);
  if (s.countedInWindow > 0) return t.window(s.doneInWindow, s.countedInWindow, pct);
  return s.todayDone ? t.dayOne : t.start;
}

export function HabitsCard({ today }: { today: Day }) {
  const t = useT().today.habits;
  const habits = useLiveQuery(() => listHabitsWithSummaries(today), [today]);

  return (
    <Card
      title={t.title}
      meta={t.meta}
      className={styles.card}
      action={
        <Link to="/progress" className={styles.cardLink}>
          {t.trends}
        </Link>
      }
    >
      {habits && habits.length === 0 && <p className={styles.quietEmpty}>{t.empty}</p>}
      <ul className={styles.habits}>
        {habits?.map(({ habit, summary }) => (
          <li key={habit.id} className={styles.habit}>
            <div className={styles.habitTop}>
              <span className={styles.habitName}>{habit.title}</span>
              <CheckButton checked={summary.todayDone} onToggle={() => void tapHabit(habit, today)} label={habitCheckLabel(habit, summary)} size="lg">
                {habit.kind === 'count' && !summary.todayDone && summary.todayValue > 0 ? summary.todayValue : undefined}
              </CheckButton>
            </div>
            <div
              className={styles.days}
              role="img"
              aria-label={t.last7(summary.last7.map((d) => `${formatDayShort(d.day)} ${t.states[d.state]}`).join(', '))}
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
