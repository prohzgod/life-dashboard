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
import { messages, useT } from '@/i18n';
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
  const t = messages().tasks.detail;
  const options = [
    { value: '', label: t.noRepeat },
    { value: 'FREQ=DAILY', label: t.everyDay },
    { value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: t.everyWeekday },
    { value: `FREQ=WEEKLY;BYDAY=${wd}`, label: t.everyNamed(weekdayName(day)) },
    { value: `FREQ=WEEKLY;INTERVAL=2;BYDAY=${wd}`, label: t.everyOtherNamed(weekdayName(day)) },
    { value: `FREQ=MONTHLY;BYMONTHDAY=${dayOfMonth(day)}`, label: t.monthlyOn(dayOfMonth(day)) },
    { value: 'FREQ=YEARLY', label: t.everyYear },
  ];
  const current = task.rrule ? parseRRule(task.rrule) : null;
  if (task.rrule && current && !options.some((o) => o.value === task.rrule)) options.splice(1, 0, { value: task.rrule, label: describeRRule(current) });
  return options;
}

export function TaskDetail({ taskId, today, context, onClose, mobile }: Props) {
  const all = useT().tasks;
  const t = all.detail;
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

  if (!data) return <aside className={styles.drawer} aria-label={t.label} />;
  if (!data.task) {
    return (
      <aside className={styles.drawer} aria-label={t.label}>
        <DrawerTop context={context} onClose={onClose} mobile={mobile} />
        <p className={styles.gone}>{t.gone}</p>
      </aside>
    );
  }

  const { task, areas, goals, subtasks, tags } = data;
  const save = (patch: Partial<Task>) => void tasksRepo.update(task.id, patch);
  const rule = task.rrule ? parseRRule(task.rrule) : null;
  const next = rule && task.doOn ? nextOccurrence(rule, task.doOn, task.doOn) : null;
  const doneSubtasks = subtasks.filter((s) => s.status === 'done').length;

  return (
    <aside className={mobile ? `${styles.drawer} ${styles.mobile}` : styles.drawer} aria-label={t.label}>
      <DrawerTop context={mobile ? context : task.doOn ? `${context} › ${formatDayShort(task.doOn)}` : context} onClose={onClose} mobile={mobile} />

      <div className={styles.titleRow}>
        <CheckButton
          checked={task.status === 'done'}
          onToggle={() => void toggleTask(task, today)}
          label={task.status === 'done' ? t.markNotDone : t.markDone}
        />
        <TitleField key={task.title} title={task.title} onSave={(title) => save({ title })} />
      </div>

      <dl className={styles.props}>
        <Prop label={t.area} htmlFor="task-area">
          <select id="task-area" className={styles.control} value={task.areaId ?? ''} onChange={(e) => save({ areaId: e.target.value || null })}>
            <option value="">{t.noArea}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Prop>
        <Prop label={t.goal} htmlFor="task-goal">
          <select id="task-goal" className={styles.control} value={task.goalId ?? ''} onChange={(e) => save({ goalId: e.target.value || null })}>
            <option value="">{t.noGoal}</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Prop>
        <Prop label={t.doOn} htmlFor="task-do-on">
          <input id="task-do-on" type="date" className={styles.control} value={task.doOn ?? ''} onChange={(e) => save({ doOn: e.target.value || null })} />
        </Prop>
        <Prop label={t.time} htmlFor="task-time">
          <input id="task-time" type="time" className={styles.control} value={task.time ?? ''} onChange={(e) => save({ time: e.target.value || null })} />
        </Prop>
        <Prop label={t.deadline} htmlFor="task-due">
          <input id="task-due" type="datetime-local" className={styles.control} value={toLocalInput(task.dueAt)} onChange={(e) => save({ dueAt: fromLocalInput(e.target.value) })} />
        </Prop>
        <Prop label={t.repeats} htmlFor="task-repeat">
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
            {next && <span className={styles.hint}>{t.nextAfter(formatDayShort(next))}</span>}
          </div>
        </Prop>
        <Prop label={t.reminder} htmlFor="task-reminder">
          <input id="task-reminder" type="datetime-local" className={styles.control} value={toLocalInput(task.reminderAt)} onChange={(e) => save({ reminderAt: fromLocalInput(e.target.value) })} />
        </Prop>
        <Prop label={t.priority} htmlFor="task-priority">
          <select
            id="task-priority"
            className={styles.control}
            data-priority={task.priority ?? undefined}
            value={task.priority ?? ''}
            onChange={(e) => save({ priority: e.target.value ? (Number(e.target.value) as 1 | 2 | 3) : null })}
          >
            <option value="">{t.none}</option>
            <option value="1">{t.priorities.high}</option>
            <option value="2">{t.priorities.medium}</option>
            <option value="3">{t.priorities.low}</option>
          </select>
        </Prop>
        <Prop label={t.estimate} htmlFor="task-estimate">
          <select
            id="task-estimate"
            className={styles.control}
            value={task.estimateMin ?? ''}
            onChange={(e) => save({ estimateMin: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">{t.none}</option>
            {[...new Set([...ESTIMATES, ...(task.estimateMin ? [task.estimateMin] : [])])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
          </select>
        </Prop>
        <Prop label={t.tags} htmlFor="task-tags">
          <TagsField key={tags.map((tag) => tag.name).join(' ')} names={tags.map((tag) => tag.name)} onSave={(names) => void setTaskTags(task.id, names)} />
        </Prop>
      </dl>

      <section className={styles.section} aria-labelledby="subtasks-heading">
        <div className={styles.sectionHead}>
          <h3 id="subtasks-heading">{t.subtasks}</h3>
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
                label={sub.status === 'done' ? all.markNotDone(sub.title) : all.markDone(sub.title)}
              />
              <span className={sub.status === 'done' ? styles.subtaskDone : undefined}>{sub.title}</span>
            </li>
          ))}
        </ul>
        <AddSubtask onAdd={(title) => addSubtask(task, title)} />
      </section>

      <section className={styles.section}>
        <label htmlFor="task-notes" className={styles.sectionHead}>
          <h3>{t.notes}</h3>
        </label>
        <NotesField key={task.id} notes={task.notes} onSave={(notes) => save({ notes })} />
      </section>

      <div className={styles.footer}>
        <div className={styles.footerActions}>
          {task.status === 'someday' ? (
            <Button size="sm" onClick={() => save({ status: 'open' })}>
              {t.moveToAnytime}
            </Button>
          ) : task.status !== 'done' ? (
            <Button size="sm" icon={<Icon name="someday" size={14} />} onClick={() => save({ status: 'someday', doOn: null })}>
              {t.someday}
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
            {t.delete}
          </Button>
        </div>
        <p className={styles.meta}>
          {t.created(timeAgo(task.createdAt))}
          {task.completedAt ? t.doneAgo(timeAgo(task.completedAt)) : ''}
          {t.stored}
        </p>
      </div>
    </aside>
  );
}

function DrawerTop({ context, onClose, mobile }: { context: string; onClose: () => void; mobile?: boolean }) {
  const t = useT().tasks.detail;
  if (mobile) {
    return (
      <div className={styles.top}>
        <button type="button" className={styles.mobileBack} onClick={onClose} aria-label={t.backTo(context)}>
          <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
          {context}
        </button>
      </div>
    );
  }
  return (
    <div className={styles.top}>
      <span className={styles.breadcrumb}>{context}</span>
      <button type="button" className={styles.close} aria-label={t.close} onClick={onClose}>
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
  const t = useT().tasks.detail;
  const [value, setValue] = useState(title);
  const commit = () => {
    const next = value.trim();
    if (next && next !== title) onSave(next);
    else setValue(title);
  };
  return (
    <input
      className={styles.title}
      aria-label={t.title}
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
  const t = useT().tasks.detail;
  const [value, setValue] = useState(names.map((n) => `#${n}`).join(' '));
  return (
    <input
      id="task-tags"
      className={styles.control}
      placeholder={t.tagsPlaceholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value.split(/[\s,]+/).filter(Boolean))}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function NotesField({ notes, onSave }: { notes: string; onSave: (notes: string) => void }) {
  const t = useT().tasks.detail;
  const [value, setValue] = useState(notes);
  return (
    <textarea
      id="task-notes"
      className={styles.notes}
      rows={4}
      placeholder={t.notesPlaceholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== notes && onSave(value)}
    />
  );
}

function AddSubtask({ onAdd }: { onAdd: (title: string) => Promise<unknown> }) {
  const t = useT().tasks.detail;
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
      <input aria-label={t.addSubtask} placeholder={t.addSubtask} value={value} onChange={(e) => setValue(e.target.value)} />
    </form>
  );
}
