import { describeRRule, parseRRule } from '@/domain/recurrence';
import { toDay, type Day } from '@/domain/days';
import { acceptInboxTask, suggestForInbox, type Task } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import type { TaskLookups } from '@/components/tasks/useTaskLookups';
import { formatDayRelative, timeAgo } from '@/lib/format';
import styles from './Tasks.module.css';

type Props = { tasks: Task[]; today: Day; lookups: TaskLookups; onOpen: (task: Task) => void };

export function InboxList({ tasks, today, lookups, onOpen }: Props) {
  if (!tasks.length) return null;
  return (
    <ul className={styles.inbox} aria-label="To triage">
      {tasks.map((task) => {
        const suggestion = suggestForInbox(task, lookups.areas);
        const rule = task.rrule ? parseRRule(task.rrule) : null;
        const parts = [
          suggestion.status === 'someday' ? 'Someday' : 'Task',
          suggestion.area?.name,
          task.doOn ? formatDayRelative(task.doOn, today) : null,
          task.dueAt ? `due ${formatDayRelative(toDay(new Date(task.dueAt)), today)}` : null,
          rule ? describeRRule(rule).toLowerCase() : null,
        ].filter(Boolean);
        return (
          <li key={task.id} className={styles.inboxItem}>
            <span className={styles.inboxIcon} aria-hidden="true">
              <Icon name="note" size={16} />
            </span>
            <div className={styles.inboxBody}>
              <button type="button" className={styles.inboxTitle} onClick={() => onOpen(task)}>
                {task.title}
              </button>
              <span className={styles.inboxMeta}>Captured {timeAgo(task.createdAt)}</span>
              <span className={styles.suggestion}>
                <span>Suggested:</span>
                <span className={styles.suggestionChip}>{parts.join(' · ')}</span>
              </span>
            </div>
            <div className={styles.inboxActions}>
              <Button variant="primary" size="sm" onClick={() => void acceptInboxTask(task, suggestion)} aria-label={`Accept “${task.title}” as ${parts.join(', ')}`}>
                Accept
              </Button>
              <button type="button" className={styles.moreButton} aria-label={`More options for “${task.title}”`} onClick={() => onOpen(task)}>
                <Icon name="more" size={18} strokeWidth={3} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
