import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { firstOnOrAfter, describeRRule, nextOccurrence, parseRRule, WEEKDAYS } from '@/domain/recurrence';
import { dayOfMonth, toDay, weekday, type Day } from '@/domain/days';
import {
  addSubtask,
  areasRepo,
  deleteTask,
  goalsRepo,
  setTaskTags,
  tagsForTask,
  tasksRepo,
  toggleTask,
  type Task,
} from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, CheckButton } from '@/components/ui';
import { formatDayShort, formatMinutes, timeAgo, weekdayName } from '@/lib/format';
import styles from './TaskDetail.module.css';

type Props = { taskId: string; today: Day; context: string; onClose: () => void; /** Phones: a full screen with a back link instead of a drawer. */ mobile?: boolean };

const ESTIMATES = [5, 10, 15, 30, 45, 60, 90, 120, 180];

/** Local "YYYY-MM-DDTHH:MM" for a datetime-local input, from a UTC ISO string. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${toDay(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function repeatOptions(task: Task, today: Day): Array<{ value: string; label: string }> {
  const day = task.doOn ?? today;
  const wd = WEEKDAYS[weekday(day)]!;
  const options = [
    { value: '', label: 'Doesn’t repeat' },
    { value: 'FREQ=DAILY', label: 'Every day' },
    { value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Every weekday' },
    { value: `FREQ=WEEKLY;BYDAY=${wd}`, label: `Every ${weekdayName(day)}` },
    { value: `FREQ=WEEKLY;INTERVAL=2;BYDAY=${wd}`, label: `Every other ${weekdayName(day)}` },
    { value: `FREQ=MONTHLY;BYMONTHDAY=${dayOfMonth(day)}`, label: `Monthly on day ${dayOfMonth(day)}` },
    { value: 'FREQ=YEARLY', label: 'Every year' },
  ];
  const current = task.rrule ? parseRRule(task.rrule) : null;
  if (task.rrule && current && !options.some((o) => o.value === task.rrule)) options.splice(1, 0, { value: task.rrule, label: describeRRule(current) });
  return options;
}

export function TaskDetail({ taskId, today, context, onClose, mobile }: Props) {
  const data = useLiveQuery(async () => {
    const task = await tasksRepo.get(taskId);
    if (!task) return { task: null };
    const [areas, goals, subtasks, tags] = await Promise.all([
      areasRepo.listOrdered(),
      goalsRepo.list((g) => g.status === 'active'),
      tasksRepo.where('parentTaskId', taskId),
      tagsForTask(taskId),
    ]);
    return { task, areas, goals, subtasks: subtasks.sort((a, b) => a.sortKey.localeCompare(b.sortKey)), tags };
  }, [taskId]);

  if (!data) return <aside className={styles.drawer} aria-label="Task details" />;
  if (!data.task) {
    return (
      <aside className={styles.drawer} aria-label="Task details">
        <DrawerTop context={context} onClose={onClose} mobile={mobile} />
        <p className={styles.gone}>This task was deleted or moved to another space.</p>
      </aside>
    );
  }

  const { task, areas, goals, subtasks, tags } = data;
  const save = (patch: Partial<Task>) => void tasksRepo.update(task.id, patch);
  const rule = task.rrule ? parseRRule(task.rrule) : null;
  const next = rule && task.doOn ? nextOccurrence(rule, task.doOn, task.doOn) : null;
  const doneSubtasks = subtasks.filter((s) => s.status === 'done').length;

  return (
    <aside className={mobile ? `${styles.drawer} ${styles.mobile}` : styles.drawer} aria-label="Task details">
      <DrawerTop context={mobile ? context : task.doOn ? `${context} › ${formatDayShort(task.doOn)}` : context} onClose={onClose} mobile={mobile} />

      <div className={styles.titleRow}>
        <CheckButton
          checked={task.status === 'done'}
          onToggle={() => void toggleTask(task, today)}
          label={task.status === 'done' ? 'Mark as not done' : 'Mark as done'}
        />
        <TitleField key={task.title} title={task.title} onSave={(title) => save({ title })} />
      </div>

      <dl className={styles.props}>
        <Prop label="Area" htmlFor="task-area">
          <select id="task-area" className={styles.control} value={task.areaId ?? ''} onChange={(e) => save({ areaId: e.target.value || null })}>
            <option value="">No area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Prop>
        <Prop label="Goal" htmlFor="task-goal">
          <select id="task-goal" className={styles.control} value={task.goalId ?? ''} onChange={(e) => save({ goalId: e.target.value || null })}>
            <option value="">Not linked to a goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Prop>
        <Prop label="Do on" htmlFor="task-do-on">
          <input id="task-do-on" type="date" className={styles.control} value={task.doOn ?? ''} onChange={(e) => save({ doOn: e.target.value || null })} />
        </Prop>
        <Prop label="Time" htmlFor="task-time">
          <input id="task-time" type="time" className={styles.control} value={task.time ?? ''} onChange={(e) => save({ time: e.target.value || null })} />
        </Prop>
        <Prop label="Deadline" htmlFor="task-due">
          <input id="task-due" type="datetime-local" className={styles.control} value={toLocalInput(task.dueAt)} onChange={(e) => save({ dueAt: fromLocalInput(e.target.value) })} />
        </Prop>
        <Prop label="Repeats" htmlFor="task-repeat">
          <div className={styles.stack}>
            <select
              id="task-repeat"
              className={styles.control}
              value={task.rrule ?? ''}
              onChange={(e) => {
                const rrule = e.target.value || null;
                const parsed = rrule ? parseRRule(rrule) : null;
                save({ rrule, doOn: parsed && !task.doOn ? firstOnOrAfter(parsed, today, today) : task.doOn });
              }}
            >
              {repeatOptions(task, today).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {next && <span className={styles.hint}>Next after this one: {formatDayShort(next)}</span>}
          </div>
        </Prop>
        <Prop label="Reminder" htmlFor="task-reminder">
          <input id="task-reminder" type="datetime-local" className={styles.control} value={toLocalInput(task.reminderAt)} onChange={(e) => save({ reminderAt: fromLocalInput(e.target.value) })} />
        </Prop>
        <Prop label="Priority" htmlFor="task-priority">
          <select
            id="task-priority"
            className={styles.control}
            data-priority={task.priority ?? undefined}
            value={task.priority ?? ''}
            onChange={(e) => save({ priority: e.target.value ? (Number(e.target.value) as 1 | 2 | 3) : null })}
          >
            <option value="">None</option>
            <option value="1">High</option>
            <option value="2">Medium</option>
            <option value="3">Low</option>
          </select>
        </Prop>
        <Prop label="Estimate" htmlFor="task-estimate">
          <select
            id="task-estimate"
            className={styles.control}
            value={task.estimateMin ?? ''}
            onChange={(e) => save({ estimateMin: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">None</option>
            {[...new Set([...ESTIMATES, ...(task.estimateMin ? [task.estimateMin] : [])])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
          </select>
        </Prop>
        <Prop label="Tags" htmlFor="task-tags">
          <TagsField key={tags.map((t) => t.name).join(' ')} names={tags.map((t) => t.name)} onSave={(names) => void setTaskTags(task.id, names)} />
        </Prop>
      </dl>

      <section className={styles.section} aria-labelledby="subtasks-heading">
        <div className={styles.sectionHead}>
          <h3 id="subtasks-heading">Subtasks</h3>
          {subtasks.length > 0 && (
            <span className={styles.sectionCount}>
              {doneSubtasks} / {subtasks.length}
            </span>
          )}
        </div>
        <ul className={styles.subtasks}>
          {subtasks.map((sub) => (
            <li key={sub.id} className={styles.subtask}>
              <CheckButton
                size="sm"
                checked={sub.status === 'done'}
                onToggle={() => void toggleTask(sub, today)}
                label={sub.status === 'done' ? `Mark “${sub.title}” as not done` : `Mark “${sub.title}” as done`}
              />
              <span className={sub.status === 'done' ? styles.subtaskDone : undefined}>{sub.title}</span>
            </li>
          ))}
        </ul>
        <AddSubtask onAdd={(title) => addSubtask(task, title)} />
      </section>

      <section className={styles.section}>
        <label htmlFor="task-notes" className={styles.sectionHead}>
          <h3>Notes</h3>
        </label>
        <NotesField key={task.id} notes={task.notes} onSave={(notes) => save({ notes })} />
      </section>

      <div className={styles.footer}>
        <div className={styles.footerActions}>
          {task.status === 'someday' ? (
            <Button size="sm" onClick={() => save({ status: 'open' })}>
              Move to Anytime
            </Button>
          ) : task.status !== 'done' ? (
            <Button size="sm" icon={<Icon name="someday" size={14} />} onClick={() => save({ status: 'someday', doOn: null })}>
              Someday
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="quiet"
            icon={<Icon name="trash" size={14} />}
            onClick={async () => {
              await deleteTask(task.id);
              onClose();
            }}
          >
            Delete
          </Button>
        </div>
        <p className={styles.meta}>
          Created {timeAgo(task.createdAt)}
          {task.completedAt ? `, done ${timeAgo(task.completedAt)}` : ''}, stored on this device
        </p>
      </div>
    </aside>
  );
}

function DrawerTop({ context, onClose, mobile }: { context: string; onClose: () => void; mobile?: boolean }) {
  if (mobile) {
    return (
      <div className={styles.top}>
        <button type="button" className={styles.mobileBack} onClick={onClose} aria-label={`Back to ${context}`}>
          <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
          {context}
        </button>
      </div>
    );
  }
  return (
    <div className={styles.top}>
      <span className={styles.breadcrumb}>{context}</span>
      <button type="button" className={styles.close} aria-label="Close details" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

function Prop({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className={styles.prop}>
      <dt>
        <label htmlFor={htmlFor}>{label}</label>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function TitleField({ title, onSave }: { title: string; onSave: (title: string) => void }) {
  const [value, setValue] = useState(title);
  const commit = () => {
    const next = value.trim();
    if (next && next !== title) onSave(next);
    else setValue(title);
  };
  return (
    <input
      className={styles.title}
      aria-label="Task title"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setValue(title);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function TagsField({ names, onSave }: { names: string[]; onSave: (names: string[]) => void }) {
  const [value, setValue] = useState(names.map((n) => `#${n}`).join(' '));
  return (
    <input
      id="task-tags"
      className={styles.control}
      placeholder="#bills #errand"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value.split(/[\s,]+/).filter(Boolean))}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function NotesField({ notes, onSave }: { notes: string; onSave: (notes: string) => void }) {
  const [value, setValue] = useState(notes);
  return (
    <textarea
      id="task-notes"
      className={styles.notes}
      rows={4}
      placeholder="Anything worth remembering about this task"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== notes && onSave(value)}
    />
  );
}

function AddSubtask({ onAdd }: { onAdd: (title: string) => Promise<unknown> }) {
  const [value, setValue] = useState('');
  return (
    <form
      className={styles.addSubtask}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        await onAdd(value.trim());
        setValue('');
      }}
    >
      <Icon name="plus" size={14} />
      <input aria-label="Add a subtask" placeholder="Add a subtask" value={value} onChange={(e) => setValue(e.target.value)} />
    </form>
  );
}
