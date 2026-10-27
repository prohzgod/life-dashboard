import { useLiveQuery } from 'dexie-react-hooks';
import { clockLabel, coversDay, spanOnDay } from '@/domain/calendar';
import { addDays, type Day } from '@/domain/days';
import { groupByDay, inView, rolledOverDays } from '@/domain/tasks';
import { listHabitsWithSummaries, loadCalendarRange, loadGoalBoard, moveRolledOverToToday, tasksRepo } from '@/data';
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
    const [tasks, board, habits, calendar] = await Promise.all([tasksRepo.list(), loadGoalBoard(today), listHabitsWithSummaries(today), loadCalendarRange(today, addDays(today, 8), today)]);
    const all = withCompletedOn(tasks);
    return {
      upcoming: all.filter((t) => inView(t, 'upcoming', today) && t.doOn! <= addDays(today, 7)),
      rolled: all.filter((t) => rolledOverDays(t, today) > 0 && !t.parentTaskId).length,
      goals: board.views.filter((v) => v.goal.status === 'active' && v.goal.horizon !== 'week' && v.progress.percent !== null).slice(0, 6),
      areas: board.areas,
      habits,
      events: calendar.events,
    };
  }, [today]);
  if (!data) return null;
  const groups = groupByDay(data.upcoming);

  // Events in the next 7 days, by day, beside the tasks planned for them.
  const eventsOn = (day: Day) =>
    data.events
      .flatMap((e) => {
        if (e.allDay) return coversDay(e.start, e.end, day) ? [{ key: e.id, at: -1, text: `${e.title}, all day`, calendar: e.calendar.name }] : [];
        const span = spanOnDay(e.start, e.end, day);
        return span ? [{ key: e.id, at: span.startMin, text: `${clockLabel(span.startMin)} ${e.title}`, calendar: e.calendar.name }] : [];
      })
      .sort((a, b) => a.at - b.at);
  const days = [...new Set([...groups.map((g) => g.day), ...Array.from({ length: 8 }, (_, i) => addDays(today, i)).filter((d) => eventsOn(d).length)])].sort();

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
        {days.length === 0 && <p className={styles.quiet}>Nothing planned yet. Step 4 is a good moment to add what matters.</p>}
        {days.map((day) => {
          const tasks = groups.find((g) => g.day === day)?.tasks ?? [];
          const events = eventsOn(day);
          return (
            <section key={day} aria-label={formatDayRelative(day, today)}>
              <h3 className={styles.dayHeading}>{formatDayRelative(day, today)}</h3>
              {events.length > 0 && (
                <ul className={styles.eventList}>
                  {events.map((e) => (
                    <li key={e.key}>
                      <span>{e.text}</span>
                      <span className={styles.quiet}>{e.calendar}</span>
                    </li>
                  ))}
                </ul>
              )}
              {tasks.length > 0 && (
                <ul className={styles.plainList}>
                  {tasks.map((t) => (
                    <TaskItem key={t.id} task={t} today={today} lookups={lookups} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
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
