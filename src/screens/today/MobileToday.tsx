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
import { useT } from '@/i18n';
import { formatDayShort, formatMinutes } from '@/lib/format';
import { habitCheckLabel } from '@/lib/habitText';
import { withCompletedOn } from '@/lib/taskView';
import { useToday } from '@/lib/useToday';
import styles from './MobileToday.module.css';

/** Today on phones: how you feel, your habits, and the plan. */
export function MobileToday() {
  const t = useT();
  const m = t.today.mobile;
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
          {m.dateWeek(formatDayShort(today), isoWeek(today))}
        </span>
        <span className={styles.side}>
          {!online && (
            <span className={styles.offline}>
              <Icon name="offline" size={14} />
              {m.offline}
            </span>
          )}
          <ProfileAvatar />
        </span>
      </header>
      <h1 className={styles.title}>{t.screens.today.title}</h1>

      <section className={styles.card} aria-labelledby="how-today">
        <div className={styles.cardHead}>
          <h2 id="how-today" className={styles.cardTitle}>
            {m.howToday}
          </h2>
          {data.entry?.sleepMinutes != null && <span className={styles.meta}>{m.sleep(formatMinutes(data.entry.sleepMinutes))}</span>}
        </div>
        <div className={styles.moods} role="group" aria-label={t.today.checkIn.mood}>
          {t.today.checkIn.moods.map((mood, i) => {
            const selected = data.entry?.mood === i + 1;
            return (
              <button key={mood} type="button" aria-pressed={selected} className={cx(styles.mood, selected && styles.moodOn)} onClick={() => void saveDailyEntry(today, { mood: selected ? null : i + 1 })}>
                {mood}
              </button>
            );
          })}
        </div>
      </section>

      {data.habits.length > 0 && (
        <ul className={styles.habits} aria-label={t.today.habits.title}>
          {data.habits.map(({ habit, summary }) => {
            const counted = habit.kind === 'count' || habit.kind === 'duration';
            const percent = summary.todayDone ? 100 : counted ? (summary.todayValue / habit.target) * 100 : 0;
            const label = habitCheckLabel(habit, summary, counted);
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
            {m.plan}
          </h2>
          {data.tasks.length > 0 && (
            <span className={styles.meta}>{t.today.plan.meta(done, data.tasks.length)}</span>
          )}
        </div>
        {data.tasks.length === 0 ? (
          <p className={styles.empty}>{m.empty}</p>
        ) : (
          <ul className={styles.tasks}>
            {data.tasks.map((task) => {
              const rolled = rolledOverDays(task, today);
              return (
                <li key={task.id} className={styles.task}>
                  <CheckButton checked={task.status === 'done'} onToggle={() => void toggleTask(task, today)} label={task.status === 'done' ? t.tasks.markNotDone(task.title) : t.tasks.markDone(task.title)} />
                  <button type="button" className={styles.taskText} onClick={() => navigate(`/tasks?view=today&task=${task.id}`)}>
                    <span className={task.status === 'done' ? styles.taskDone : undefined}>{task.title}</span>
                    {rolled > 0 && <span className={styles.rolled}>{rolled === 1 ? m.fromYesterday : m.from(formatDayShort(task.doOn!))}</span>}
                  </button>
                  {(task.time || task.estimateMin) && <span className={styles.when}>{task.time ?? formatMinutes(task.estimateMin!)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
