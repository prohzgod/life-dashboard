import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { inView, rolledOverDays, sortForView } from '@/domain/tasks';
import { captureTask, moveRolledOverToToday, planTaskForToday, tasksRepo, type Task } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { QuickAddField } from '@/components/tasks/QuickAddField';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTaskLookups } from '@/components/tasks/useTaskLookups';
import { ArrowLink, Button, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import { useFlipList } from '@/lib/motion';
import { withCompletedOn } from '@/lib/taskView';
import styles from './Today.module.css';

/** How many Anytime tasks to offer for today. */
const ANYTIME_SHOWN = 4;

/** Today's plan: add a task, tick them off, and pull something in from Anytime. On phones, done tasks fold into one line. */
export function PlanCard({ today, compact = false, className }: { today: Day; compact?: boolean; className?: string }) {
  const t = useT().today.plan;
  const navigate = useNavigate();
  const lookups = useTaskLookups();
  const data = useLiveQuery(async () => {
    const all = withCompletedOn(await tasksRepo.list());
    return {
      tasks: sortForView(all.filter((t) => inView(t, 'today', today)), 'today'),
      anytime: sortForView(all.filter((t) => inView(t, 'anytime', today)), 'anytime').slice(0, ANYTIME_SHOWN),
    };
  }, [today]);
  const tasks = data?.tasks;
  const list = useFlipList<HTMLUListElement>();

  const done = tasks?.filter((t) => t.status === 'done').length ?? 0;
  const open = tasks?.filter((t) => t.status !== 'done') ?? [];
  const rolled = open.filter((t) => rolledOverDays(t, today) > 0).length;
  // Phones show what's left and fold the finished ones into a link.
  const shown = compact && open.length ? open : (tasks ?? []);
  const folded = (tasks?.length ?? 0) - shown.length;

  const openTask = (task: Task) => navigate(`/tasks?view=today&task=${task.id}`);

  return (
    <Card
      title={t.title}
      meta={tasks?.length ? t.doneOf(done, tasks.length) : undefined}
      className={cx(styles.plan, className)}
      action={<ArrowLink to="/tasks?view=today" label={t.open} />}
    >
      <QuickAddField
        label={t.addLabel}
        placeholder={t.addPlaceholder}
        today={today}
        areas={lookups.areas}
        onSubmit={(text) => captureTask(text, { today, status: 'open', defaultDoOn: today })}
      />
      {rolled > 0 && (
        <div className={styles.rolledNotice}>
          <span>{t.rolled(rolled)}</span>
          <Button variant="quiet" size="sm" onClick={() => void moveRolledOverToToday(today)}>
            {t.planForToday(rolled)}
          </Button>
        </div>
      )}
      {shown.length > 0 ? (
        <ul ref={list} className={styles.taskList} aria-label={t.list}>
          {shown.map((task) => (
            <TaskItem key={task.id} task={task} today={today} lookups={lookups} variant="plan" onOpen={openTask} />
          ))}
        </ul>
      ) : (
        tasks && <p className={styles.quietEmpty}>{t.empty}</p>
      )}
      {folded > 0 && (
        <Link to="/tasks?view=today" className={styles.foldLink}>
          {t.moreDone(folded)}
        </Link>
      )}
      {!compact && data && data.anytime.length > 0 && (
        <div className={styles.anytime}>
          <div className={styles.anytimeHead}>
            <span className={styles.anytimeTitle}>{t.anytime}</span>
            <span className={styles.anytimeHint}>{t.anytimeHint}</span>
          </div>
          <ul className={styles.anytimeList}>
            {data.anytime.map((task) => (
              <li key={task.id}>
                <button type="button" className={styles.anytimeChip} aria-label={t.addToToday(task.title)} onClick={() => void planTaskForToday(task.id, today)}>
                  <Icon name="plus" size={16} strokeWidth={2} />
                  {task.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
