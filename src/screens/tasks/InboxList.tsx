import { describeRRule, parseRRule } from '@/domain/recurrence';
import { toDay, type Day } from '@/domain/days';
import { acceptInboxTask, suggestForInbox, type Task } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import type { TaskLookups } from '@/components/tasks/useTaskLookups';
import { useT } from '@/i18n';
import { formatDayRelative, timeAgo } from '@/lib/format';
import styles from './Tasks.module.css';

type Props = { tasks: Task[]; today: Day; lookups: TaskLookups; onOpen: (task: Task) => void };

export function InboxList({ tasks, today, lookups, onOpen }: Props) {
  const t = useT().tasks;
  if (!tasks.length) return null;
  return (
    <ul className={styles.inbox} aria-label={t.inbox.label}>
      {tasks.map((task) => {
        const suggestion = suggestForInbox(task, lookups.areas);
        const rule = task.rrule ? parseRRule(task.rrule) : null;
        const parts = [
          suggestion.status === 'someday' ? t.someday : t.task,
          suggestion.area?.name,
          task.doOn ? formatDayRelative(task.doOn, today) : null,
          task.dueAt ? t.due(formatDayRelative(toDay(new Date(task.dueAt)), today)) : null,
          rule ? t.repeat.inline(describeRRule(rule)) : null,
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
              <span className={styles.inboxMeta}>{t.inbox.captured(timeAgo(task.createdAt))}</span>
              <span className={styles.suggestion}>
                <span>{t.inbox.suggested}</span>
                <span className={styles.suggestionChip}>{parts.join(', ')}</span>
              </span>
            </div>
            <div className={styles.inboxActions}>
              <Button variant="primary" size="sm" onClick={() => void acceptInboxTask(task, suggestion)} aria-label={t.inbox.acceptAs(task.title, parts.join(', '))}>
                {t.inbox.accept}
              </Button>
              <button type="button" className={styles.moreButton} aria-label={t.inbox.more(task.title)} onClick={() => onOpen(task)}>
                <Icon name="more" size={18} strokeWidth={3} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
