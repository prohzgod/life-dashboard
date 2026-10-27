import { describeRRule, describeRRuleShort, parseRRule } from '@/domain/recurrence';
import { rolledOverDays } from '@/domain/tasks';
import { toDay, type Day } from '@/domain/days';
import { toggleTask, type Task } from '@/data';
import { CheckButton } from '@/components/ui/CheckButton';
import { cx } from '@/components/ui/cx';
import { formatDayRelative, formatDayShort, formatMinutes } from '@/lib/format';
import { rolledOverText } from '@/lib/taskText';
import { Icon } from '../icons/Icon';
import styles from './TaskItem.module.css';
import type { TaskLookups } from './useTaskLookups';

type TaskItemProps = {
  task: Task;
  today: Day;
  lookups: TaskLookups;
  /** "plan": two lines with area, goal, repeat (Today). "compact": one line, details on the right (lists). */
  variant?: 'plan' | 'compact';
  selected?: boolean;
  onOpen?: (task: Task) => void;
  /** Lead the details with the task's day (lists that mix days, like an area). */
  showDay?: boolean;
};

/** The right-hand "when": a time, else an estimate. */
function whenText(task: Task): string | null {
  if (task.time) return task.time;
  if (task.estimateMin) return formatMinutes(task.estimateMin);
  return null;
}

export function TaskItem({ task, today, lookups, variant = 'compact', selected, onOpen, showDay }: TaskItemProps) {
  const done = task.status === 'done';
  const area = task.areaId ? lookups.areaById.get(task.areaId) : undefined;
  const goal = task.goalId ? lookups.goalById.get(task.goalId) : undefined;
  const rule = task.rrule ? parseRRule(task.rrule) : null;
  const rolled = rolledOverDays(task, today);
  const tags = lookups.tagsByTask.get(task.id) ?? [];
  const when = whenText(task);
  const check = (
    <CheckButton
      checked={done}
      onToggle={() => void toggleTask(task, today)}
      label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      size={variant === 'plan' ? 'md' : 'sm'}
    />
  );
  const title = onOpen ? (
    <button type="button" className={styles.titleButton} onClick={() => onOpen(task)}>
      {task.title}
    </button>
  ) : (
    <span>{task.title}</span>
  );

  if (variant === 'compact') {
    const details = [
      showDay && task.doOn ? formatDayRelative(task.doOn, today) : null,
      area?.name,
      task.time,
      task.estimateMin ? formatMinutes(task.estimateMin) : null,
      rule ? describeRRuleShort(rule).replace(/^R/, 'r') : null,
      task.dueAt ? `due ${formatDayShort(toDay(new Date(task.dueAt)))}` : null,
      task.priority === 1 ? 'high' : null,
      ...tags.map((t) => `#${t}`),
    ].filter(Boolean);
    return (
      <li className={cx(styles.compact, selected && styles.selected, done && styles.done)}>
        {check}
        <span className={styles.compactTitle}>{title}</span>
        {details.length > 0 && <span className={styles.details}>{details.join(' · ')}</span>}
      </li>
    );
  }

  return (
    <li className={cx(styles.plan, selected && styles.selected)}>
      {check}
      <div className={styles.body}>
        <span className={cx(styles.planTitle, done && styles.doneTitle)}>{title}</span>
        <span className={styles.meta}>
          {area && (
            <span className={styles.metaItem}>
              <span className={styles.dot} style={{ background: `var(--${area.color})` }} aria-hidden="true" />
              {area.name}
            </span>
          )}
          {goal && (
            <span className={styles.metaItem}>
              <Icon name="goals" size={12} />
              {goal.title}
            </span>
          )}
          {rule && (
            <span className={styles.metaItem}>
              <Icon name="repeat" size={12} />
              {describeRRule(rule)}
            </span>
          )}
          {rolled > 0 && <span className={styles.rolled}>{rolledOverText(rolled, task.doOn!)}</span>}
          {task.priority === 1 && !done && <span className={styles.high}>High priority</span>}
        </span>
      </div>
      {when && <span className={styles.when}>{when}</span>}
    </li>
  );
}
