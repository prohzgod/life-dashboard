import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { inView, rolledOverDays, sortForView } from '@/domain/tasks';
import { captureTask, moveRolledOverToToday, tasksRepo, type Task } from '@/data';
import { QuickAddField } from '@/components/tasks/QuickAddField';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTaskLookups } from '@/components/tasks/useTaskLookups';
import { Button, Card } from '@/components/ui';
import { formatMinutes, plural } from '@/lib/format';
import { withCompletedOn } from '@/lib/taskView';
import styles from './Today.module.css';

export function PlanCard({ today }: { today: Day }) {
  const navigate = useNavigate();
  const lookups = useTaskLookups();
  const tasks = useLiveQuery(async () => {
    const all = withCompletedOn(await tasksRepo.list());
    return sortForView(all.filter((t) => inView(t, 'today', today)), 'today');
  }, [today]);

  const done = tasks?.filter((t) => t.status === 'done').length ?? 0;
  const open = tasks?.filter((t) => t.status !== 'done') ?? [];
  const minutesLeft = open.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0);
  const rolled = open.filter((t) => rolledOverDays(t, today) > 0).length;
  const meta = tasks?.length
    ? `${done} of ${tasks.length} done${minutesLeft ? `, about ${formatMinutes(minutesLeft)} left` : ''}`
    : undefined;

  const open_ = (task: Task) => navigate(`/tasks?view=today&task=${task.id}`);

  return (
    <Card
      title="Today’s plan"
      meta={meta}
      className={styles.card}
      action={
        <Link to="/tasks?view=today" className={styles.cardLink}>
          All tasks
        </Link>
      }
    >
      <QuickAddField
        label="Add a task"
        placeholder="Add a task, e.g. “Pay rent every 1st #finance !high”"
        today={today}
        areas={lookups.areas}
        onSubmit={(text) => captureTask(text, { today, status: 'open', defaultDoOn: today })}
      />
      {rolled > 0 && (
        <div className={styles.rolledNotice}>
          <span>{plural(rolled, 'task')} rolled over from earlier. No harm done.</span>
          <Button variant="quiet" size="sm" onClick={() => void moveRolledOverToToday(today)}>
            Plan {rolled === 1 ? 'it' : 'them'} for today
          </Button>
        </div>
      )}
      {tasks && tasks.length > 0 ? (
        <ul className={styles.taskList} aria-label="Today’s tasks">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} today={today} lookups={lookups} variant="plan" onOpen={open_} />
          ))}
        </ul>
      ) : (
        tasks && <p className={styles.quietEmpty}>Nothing planned yet. Add something above, or pick from Anytime.</p>
      )}
    </Card>
  );
}
