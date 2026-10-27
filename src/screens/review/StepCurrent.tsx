import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, type Day } from '@/domain/days';
import { groupByDay, inView, rolledOverDays } from '@/domain/tasks';
import { listHabitsWithSummaries, loadGoalBoard, moveRolledOverToToday, tasksRepo } from '@/data';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTaskLookups } from '@/components/tasks/useTaskLookups';
import { Button, Card, PaceBar } from '@/components/ui';
import { formatDayRelative, plural } from '@/lib/format';
import { withCompletedOn } from '@/lib/taskView';
import styles from './Review.module.css';

/** Step 2: what's coming up, where your goals stand, and how habits went. */
export function StepCurrent({ today }: { today: Day }) {
  const lookups = useTaskLookups();
  const data = useLiveQuery(async () => {
    const [tasks, board, habits] = await Promise.all([tasksRepo.list(), loadGoalBoard(today), listHabitsWithSummaries(today)]);
    const all = withCompletedOn(tasks);
    return {
      upcoming: all.filter((t) => inView(t, 'upcoming', today) && t.doOn! <= addDays(today, 7)),
      rolled: all.filter((t) => rolledOverDays(t, today) > 0 && !t.parentTaskId).length,
      goals: board.views.filter((v) => v.goal.status === 'active' && v.goal.horizon !== 'week' && v.progress.percent !== null).slice(0, 6),
      areas: board.areas,
      habits,
    };
  }, [today]);
  if (!data) return null;
  const groups = groupByDay(data.upcoming);

  return (
    <div className={styles.split}>
      <Card title="Coming up" meta="the next 7 days" className={styles.card}>
        {data.rolled > 0 && (
          <div className={styles.notice}>
            <span>{plural(data.rolled, 'task')} rolled over.</span>
            <Button variant="quiet" size="sm" onClick={() => void moveRolledOverToToday(today)}>
              Plan for today
            </Button>
          </div>
        )}
        {groups.length === 0 && <p className={styles.quiet}>Nothing planned yet. Step 4 is a good moment to add what matters.</p>}
        {groups.map((g) => (
          <section key={g.day} aria-label={formatDayRelative(g.day, today)}>
            <h3 className={styles.dayHeading}>{formatDayRelative(g.day, today)}</h3>
            <ul className={styles.plainList}>
              {g.tasks.map((t) => (
                <TaskItem key={t.id} task={t} today={today} lookups={lookups} />
              ))}
            </ul>
          </section>
        ))}
        <p className={styles.quiet}>Calendar events will appear here once Calendar is connected.</p>
      </Card>
      <div className={styles.column}>
        <Card title="Goals" meta="pace as of today" className={styles.card}>
          {data.goals.length === 0 && <p className={styles.quiet}>No measured goals yet.</p>}
          {data.goals.map(({ goal, progress, pace }) => (
            <PaceBar
              key={goal.id}
              label={goal.title}
              progress={progress.percent ?? 0}
              expected={pace.expected ?? 0}
              area={data.areas.find((a) => a.id === goal.areaId)?.color}
              statusText={pace.sentence}
            />
          ))}
        </Card>
        <Card title="Habits" meta="the last 7 days" className={styles.card}>
          <ul className={styles.habitList}>
            {data.habits.map(({ habit, summary }) => (
              <li key={habit.id}>
                <span>{habit.title}</span>
                <span className={styles.quiet}>
                  {summary.last7.filter((d) => d.state === 'done').length} of {summary.last7.filter((d) => d.state === 'done' || d.state === 'missed').length || 0} days
                  {summary.streak > 1 ? ` · ${summary.streak}-day streak` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
