import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { isoWeek } from '@/domain/days';
import { inView, rolledOverDays, sortForView } from '@/domain/tasks';
import { getDailyEntry, listHabitsWithSummaries, saveDailyEntry, tapHabit, tasksRepo, toggleTask } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { ProfileAvatar } from '@/components/shell/ProfileAvatar';
import { useOnlineStatus } from '@/components/shell/useOnlineStatus';
import { CheckButton } from '@/components/ui';
import { Ring } from '@/components/ui/Ring';
import { cx } from '@/components/ui/cx';
import { formatDayShort, formatMinutes, singular } from '@/lib/format';
import { withCompletedOn } from '@/lib/taskView';
import { useToday } from '@/lib/useToday';
import styles from './MobileToday.module.css';

const MOODS = ['Awful', 'Low', 'Okay', 'Good', 'Great'];

/** Today on phones: how you feel, your habits, and the plan. */
export function MobileToday() {
  const today = useToday();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const data = useLiveQuery(async () => {
    const [tasks, habits, entry] = await Promise.all([tasksRepo.list(), listHabitsWithSummaries(today), getDailyEntry(today)]);
    return { tasks: sortForView(withCompletedOn(tasks).filter((t) => inView(t, 'today', today)), 'today'), habits, entry: entry ?? null };
  }, [today]);
  if (!data) return null;
  const done = data.tasks.filter((t) => t.status === 'done').length;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <span className={styles.date}>
          {formatDayShort(today)} · week {isoWeek(today)}
        </span>
        <span className={styles.side}>
          {!online && (
            <span className={styles.offline}>
              <Icon name="offline" size={14} />
              Offline · saved here
            </span>
          )}
          <ProfileAvatar />
        </span>
      </header>
      <h1 className={styles.title}>Today</h1>

      <section className={styles.card} aria-labelledby="how-today">
        <div className={styles.cardHead}>
          <h2 id="how-today" className={styles.cardTitle}>
            How’s today?
          </h2>
          {data.entry?.sleepMinutes != null && <span className={styles.meta}>sleep {formatMinutes(data.entry.sleepMinutes)}</span>}
        </div>
        <div className={styles.moods} role="group" aria-label="Mood">
          {MOODS.map((m, i) => {
            const selected = data.entry?.mood === i + 1;
            return (
              <button key={m} type="button" aria-pressed={selected} className={cx(styles.mood, selected && styles.moodOn)} onClick={() => void saveDailyEntry(today, { mood: selected ? null : i + 1 })}>
                {m}
              </button>
            );
          })}
        </div>
      </section>

      {data.habits.length > 0 && (
        <ul className={styles.habits} aria-label="Habits">
          {data.habits.map(({ habit, summary }) => {
            const counted = habit.kind === 'count' || habit.kind === 'duration';
            const percent = summary.todayDone ? 100 : counted ? (summary.todayValue / habit.target) * 100 : 0;
            const label = summary.todayDone
              ? `Undo today’s ${habit.title}`
              : counted
                ? `Add one${habit.unit ? ` ${singular(habit.unit)}` : ''} to ${habit.title} (${summary.todayValue} of ${habit.target})`
                : `Check in ${habit.title} for today`;
            return (
              <li key={habit.id}>
                <button type="button" role="checkbox" aria-checked={summary.todayDone} aria-label={label} className={styles.habit} onClick={() => void tapHabit(habit, today)}>
                  <Ring percent={percent} size={50} stroke={summary.todayDone ? 4 : 4} color="var(--primary)">
                    {summary.todayDone ? (
                      <Icon name="check" size={22} strokeWidth={2.4} />
                    ) : counted ? (
                      <span className={styles.count}>
                        {summary.todayValue}/{habit.target}
                      </span>
                    ) : null}
                  </Ring>
                  <span className={styles.habitName}>{habit.title.replace(/ \d+ \w+$/, '')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <section className={styles.card} aria-labelledby="plan">
        <div className={styles.cardHead}>
          <h2 id="plan" className={styles.cardTitle}>
            Plan
          </h2>
          {data.tasks.length > 0 && (
            <span className={styles.meta}>
              {done} of {data.tasks.length} done
            </span>
          )}
        </div>
        {data.tasks.length === 0 ? (
          <p className={styles.empty}>Nothing planned. Tap + to add something.</p>
        ) : (
          <ul className={styles.tasks}>
            {data.tasks.map((t) => {
              const rolled = rolledOverDays(t, today);
              return (
                <li key={t.id} className={styles.task}>
                  <CheckButton checked={t.status === 'done'} onToggle={() => void toggleTask(t, today)} label={t.status === 'done' ? `Mark “${t.title}” as not done` : `Mark “${t.title}” as done`} />
                  <button type="button" className={styles.taskText} onClick={() => navigate(`/tasks?view=today&task=${t.id}`)}>
                    <span className={t.status === 'done' ? styles.taskDone : undefined}>{t.title}</span>
                    {rolled > 0 && <span className={styles.rolled}>{rolled === 1 ? 'from yesterday' : `from ${formatDayShort(t.doOn!)}`}</span>}
                  </button>
                  {(t.time || t.estimateMin) && <span className={styles.when}>{t.time ?? formatMinutes(t.estimateMin!)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
