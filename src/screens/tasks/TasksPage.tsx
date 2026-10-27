import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ProfileAvatar } from '@/components/shell/ProfileAvatar';
import { Segmented } from '@/components/ui';
import { useIsMobile } from '@/lib/useMediaQuery';
import { inView, rolledOverDays, sortForView, groupByDay, countViews, type TaskView } from '@/domain/tasks';
import { addDays, type Day } from '@/domain/days';
import { captureTask, listTaskTags, tasksRepo, type Task } from '@/data';
import { PageHeader } from '@/components/shell/PageHeader';
import { QuickAddField } from '@/components/tasks/QuickAddField';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTaskLookups, type TaskLookups } from '@/components/tasks/useTaskLookups';
import { formatDayRelative, formatDayShort, plural } from '@/lib/format';
import { withCompletedOn } from '@/lib/taskView';
import { useToday } from '@/lib/useToday';
import { InboxList } from './InboxList';
import { TaskDetail } from './TaskDetail';
import { TaskViewsNav } from './TaskViewsNav';
import { VIEW_LABELS } from './viewLabels';
import styles from './Tasks.module.css';

const VIEWS: TaskView[] = ['inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook'];

const SUBTITLES: Record<Exclude<TaskView, 'inbox'>, string> = {
  today: 'Planned for today, plus anything that rolled over.',
  upcoming: 'What’s planned for the days ahead.',
  anytime: 'No date yet. Pick from here when you plan your day.',
  someday: 'Ideas worth keeping, without the pressure.',
  logbook: 'Everything you’ve finished, newest first.',
};

export function TasksPage() {
  const today = useToday();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const lookups = useTaskLookups();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const areaId = params.get('area');
  const tagId = params.get('tag');
  const requested = params.get('view') as TaskView | null;
  const view: TaskView | null = pathname === '/inbox' ? 'inbox' : areaId || tagId ? null : requested && VIEWS.includes(requested) ? requested : 'today';
  const selectedId = params.get('task');

  const data = useLiveQuery(async () => {
    const [tasks, tags] = await Promise.all([tasksRepo.list(), listTaskTags()]);
    return { tasks: withCompletedOn(tasks), tags };
  });
  const tasks = data?.tasks ?? [];
  const counts = countViews(tasks, today);
  const area = areaId ? lookups.areaById.get(areaId) : undefined;
  const tag = tagId ? data?.tags.find((t) => t.id === tagId) : undefined;

  const openTask = (task: Task) => {
    const next = new URLSearchParams(params);
    next.set('task', task.id);
    setParams(next);
  };
  const closeTask = () => {
    const next = new URLSearchParams(params);
    next.delete('task');
    setParams(next);
  };

  let title: string;
  let subtitle: string;
  let body: React.ReactNode;

  if (view === 'inbox') {
    title = 'Inbox';
    subtitle = counts.inbox
      ? `${counts.inbox} to triage. Clear it in 2 minutes, or during your weekly review.`
      : 'Inbox zero. Anything you capture lands here first.';
    const upcoming = tasks.filter((t) => inView(t, 'upcoming', today) && t.doOn! <= addDays(today, 7));
    body = (
      <>
        {/* Phones capture with the + button instead. */}
        {!isMobile && (
          <QuickAddField
            variant="box"
            label="Capture anything"
            placeholder="Capture anything. Natural language works."
            today={today}
            areas={lookups.areas}
            onSubmit={(text) => captureTask(text, { today, status: 'inbox' })}
          />
        )}
        <InboxList tasks={sortForView(tasks.filter((t) => inView(t, 'inbox', today)), 'inbox')} today={today} lookups={lookups} onOpen={openTask} />
        {upcoming.length > 0 && (
          <section className={styles.section} aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className={styles.sectionTitle}>
              Upcoming
            </h2>
            <DayGroups tasks={upcoming} today={today} lookups={lookups} selectedId={selectedId} onOpen={openTask} />
          </section>
        )}
      </>
    );
  } else if (view) {
    title = VIEW_LABELS[view];
    const list = sortForView(tasks.filter((t) => inView(t, view, today)), view);
    const rolled = view === 'today' ? list.filter((t) => rolledOverDays(t, today) > 0).length : 0;
    subtitle = rolled ? `${SUBTITLES.today} ${plural(rolled, 'task')} rolled over.` : SUBTITLES[view];
    body = (
      <>
        {(view === 'today' || view === 'anytime') && (
          <QuickAddField
            label="Add a task"
            placeholder={view === 'today' ? 'Add a task for today' : 'Add a task, no date needed'}
            today={today}
            areas={lookups.areas}
            onSubmit={(text) => captureTask(text, { today, status: 'open', defaultDoOn: view === 'today' ? today : null })}
          />
        )}
        {view === 'upcoming' ? (
          <DayGroups tasks={list} today={today} lookups={lookups} selectedId={selectedId} onOpen={openTask} empty="Nothing planned ahead yet." />
        ) : (
          <TaskList tasks={list} today={today} lookups={lookups} selectedId={selectedId} onOpen={openTask} empty={EMPTY[view]} />
        )}
      </>
    );
  } else {
    title = area ? area.name : tag ? `#${tag.name}` : 'Tasks';
    subtitle = area ? `Open tasks in ${area.name}, by date.` : 'Open tasks with this tag, by date.';
    const list = tasks.filter(
      (t) =>
        !t.parentTaskId &&
        t.status !== 'done' &&
        (area ? t.areaId === area.id : !!tag && (lookups.tagsByTask.get(t.id) ?? []).includes(tag.name)),
    );
    body = <TaskList tasks={sortForView(list, 'upcoming')} today={today} lookups={lookups} selectedId={selectedId} onOpen={openTask} empty="Nothing open here." showDay />;
  }

  if (isMobile) {
    if (selectedId) return <TaskDetail key={selectedId} taskId={selectedId} today={today} context={title} onClose={closeTask} mobile />;
    const tab = view === 'inbox' || view === 'today' || view === 'upcoming' || view === 'someday' ? view : 'today';
    return (
      <div className={styles.mobilePage}>
        <header className={styles.mobileHeader}>
          <h1 className={styles.mobileTitle}>Tasks</h1>
          <ProfileAvatar />
        </header>
        <Segmented
          label="Task lists"
          className={styles.mobileTabs}
          options={[
            { value: 'inbox', label: counts.inbox ? `Inbox ${counts.inbox}` : 'Inbox' },
            { value: 'today', label: 'Today' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'someday', label: 'Someday' },
          ]}
          value={tab}
          onChange={(v) => navigate(v === 'inbox' ? '/inbox' : `/tasks?view=${v}`)}
        />
        <p className={styles.mobileSub}>{view === 'inbox' && counts.inbox ? `${counts.inbox} to sort. Accept, or open one for more.` : subtitle}</p>
        {data && body}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <TaskViewsNav counts={counts} active={view} areaId={areaId} tagId={tagId} areas={lookups.areas} tags={data?.tags ?? []} />
      <div className={styles.main}>
        <PageHeader title={title} subtitle={subtitle} />
        {data && body}
      </div>
      {selectedId && <TaskDetail key={selectedId} taskId={selectedId} today={today} context={title} onClose={closeTask} />}
    </div>
  );
}

const EMPTY: Record<Exclude<TaskView, 'inbox' | 'upcoming'>, string> = {
  today: 'Nothing planned for today.',
  anytime: 'Nothing waiting without a date.',
  someday: 'No someday ideas yet.',
  logbook: 'Finished tasks will collect here.',
};

type ListProps = {
  tasks: Array<Task & { completedOn?: string | null }>;
  today: Day;
  lookups: TaskLookups;
  selectedId: string | null;
  onOpen: (task: Task) => void;
  empty?: string;
  showDay?: boolean;
};

function TaskList({ tasks, today, lookups, selectedId, onOpen, empty, showDay }: ListProps) {
  if (!tasks.length) return <p className={styles.empty}>{empty}</p>;
  return (
    <ul className={styles.listCard}>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} today={today} lookups={lookups} selected={task.id === selectedId} onOpen={onOpen} showDay={showDay} />
      ))}
    </ul>
  );
}

function DayGroups({ tasks, today, lookups, selectedId, onOpen, empty }: ListProps) {
  const groups = groupByDay(tasks);
  if (!groups.length) return <p className={styles.empty}>{empty}</p>;
  return (
    <div className={styles.listCard}>
      {groups.map((group) => (
        <section key={group.day} className={styles.dayGroup} aria-label={formatDayShort(group.day)}>
          <h3 className={styles.dayHeading}>
            {group.day === addDays(today, 1) ? `Tomorrow · ${formatDayShort(group.day)}` : formatDayRelative(group.day, today)}
          </h3>
          <ul className={styles.plainList}>
            {group.tasks.map((task) => (
              <TaskItem key={task.id} task={task} today={today} lookups={lookups} selected={task.id === selectedId} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
