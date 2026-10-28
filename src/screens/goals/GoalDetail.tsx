import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, dayToDate, type Day } from '@/domain/days';
import { catchUp, formatAmount, STRETCH_WIN } from '@/domain/goals';
import {
  addCatchUpTask,
  addKeyResult,
  addMilestone,
  deleteMilestone,
  goalConnections,
  goalHistory,
  logGoalValue,
  setGoalStatus,
  toggleMilestone,
  updateKeyResult,
  type GoalBoard,
  type GoalView,
} from '@/data';
import { Chart } from '@/components/charts/Chart';
import { chartFont } from '@/components/charts/chartTheme';
import { Icon } from '@/components/icons/Icon';
import { Button, Menu } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { formatDayShort } from '@/lib/format';
import { goalTypeChip, METHOD_LABELS } from '@/lib/goalText';
import { GoalForm } from './GoalForm';
import styles from './Goals.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function GoalDetail({ view, board, today }: { view: GoalView; board: GoalBoard; today: Day }) {
  const navigate = useNavigate();
  const { goal, progress, pace } = view;
  const [editing, setEditing] = useState(false);
  const [added, setAdded] = useState(false);
  const area = board.areas.find((a) => a.id === goal.areaId);
  const history = useLiveQuery(() => goalHistory(goal.id, today), [goal.id, today, goal.updatedAt, progress.percent]);
  const links = useLiveQuery(() => goalConnections(goal.id), [goal.id, goal.updatedAt]);
  const milestones = board.milestones.filter((m) => m.goalId === goal.id).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const keyResults = board.keyResults.filter((k) => k.goalId === goal.id);
  const suggestion = catchUp(goal, progress, pace, today);
  const percent = progress.percent;
  const color = area ? `var(--${area.color})` : 'var(--primary)';

  return (
    <aside className={styles.detail} aria-label="Goal details">
      <div className={styles.detailTop}>
        <div className={styles.chips}>
          {area && (
            <span className={styles.chip} style={{ background: `var(--${area.color}-soft)`, color: `var(--${area.color}-ink)`, fontWeight: 600 }}>
              {area.name}
            </span>
          )}
          <span className={styles.chip}>{goalTypeChip(goal)}</span>
          <span className={styles.chip}>
            {formatDayShort(goal.startDate)} to {formatDayShort(goal.endDate)}
          </span>
        </div>
        <Menu
          label="Goal options"
          trigger={<Icon name="more" size={18} strokeWidth={3} />}
          items={[
            { label: 'Edit goal', onSelect: () => setEditing(true) },
            { label: goal.status === 'paused' ? 'Resume' : 'Pause', onSelect: () => void setGoalStatus(goal.id, goal.status === 'paused' ? 'active' : 'paused') },
            { label: 'Mark as done', onSelect: () => void setGoalStatus(goal.id, 'done') },
            {
              label: 'Drop this goal',
              danger: true,
              onSelect: async () => {
                await setGoalStatus(goal.id, 'dropped');
                navigate('/goals');
              },
            },
          ]}
        />
      </div>

      <div className={styles.detailHead}>
        <h2 className={styles.detailTitle}>{goal.title}</h2>
        {goal.why && (
          <p className={styles.why}>
            <span className={styles.quietInline}>Why it matters:</span> {goal.why}
          </p>
        )}
      </div>

      <div className={styles.bigRow}>
        <div className={styles.bigText}>
          <span className={styles.big}>{goal.progressMethod === 'keyResultAverage' && progress.score !== undefined ? progress.score.toFixed(2) : percent === null ? '–' : `${Math.round(percent)}%`}</span>
          <span className={styles.quiet}>
            {pace.expected !== null && (pace.state === 'on-pace' || pace.state === 'behind')
              ? `Expected by today: ${Math.round(pace.expected)}%${goal.commitment === 'aspirational' ? ' (stretch line)' : ''}`
              : METHOD_LABELS[goal.progressMethod]}
          </span>
        </div>
        <span className={cx(styles.pill, pace.state === 'behind' ? styles.pillWarning : pace.state === 'on-pace' || pace.state === 'done' ? styles.pillSuccess : styles.pillQuiet)}>
          {pace.state === 'behind' ? pace.sentence.replace('Behind by about ', 'Behind ~') : pace.sentence}
        </span>
      </div>

      {history && history.length > 0 && <ProgressChart goalStart={goal.startDate} goalEnd={goal.endDate} history={history} today={today} color={area?.color} stretch={goal.commitment === 'aspirational'} title={goal.title} />}

      {(goal.progressMethod === 'metric' || goal.progressMethod === 'manual') && <LogValue key={goal.currentValue} goalId={goal.id} value={goal.currentValue} unit={goal.progressMethod === 'manual' && !goal.unit ? '%' : goal.unit} target={goal.targetValue} />}

      {suggestion && (
        <div className={styles.catchUp}>
          <p>{added ? 'Added to today’s plan.' : suggestion.text}</p>
          {!added && (
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                await addCatchUpTask(goal, today);
                setAdded(true);
              }}
            >
              Add to plan
            </Button>
          )}
        </div>
      )}

      {(goal.progressMethod === 'milestones' || milestones.length > 0) && (
        <section className={styles.section} aria-labelledby="milestones">
          <h3 id="milestones" className={styles.sectionTitle}>
            Milestones
          </h3>
          <ul className={styles.plainList}>
            {milestones.map((m) => (
              <li key={m.id} className={styles.milestone}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={!!m.doneAt}
                  aria-label={`${m.title}${m.doneAt ? ', done' : ''}`}
                  className={cx(styles.milestoneDot, m.doneAt && styles.milestoneDone)}
                  style={m.doneAt ? { background: color } : undefined}
                  onClick={() => void toggleMilestone(m.id)}
                />
                <span className={styles.grow}>{m.title}</span>
                <span className={styles.quiet}>{m.doneAt ? formatDayShort(m.doneAt.slice(0, 10)).slice(4) : m.dueDate ? `by ${formatDayShort(m.dueDate).slice(4)}` : ''}</span>
                <button type="button" className={styles.remove} aria-label={`Remove ${m.title}`} onClick={() => void deleteMilestone(m.id)}>
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
          <AddRow
            label="Add a milestone"
            withDate
            onAdd={(title, date) => addMilestone(goal.id, title, date)}
          />
        </section>
      )}

      {goal.progressMethod === 'keyResultAverage' && (
        <section className={styles.section} aria-labelledby="krs">
          <h3 id="krs" className={styles.sectionTitle}>
            Key results
          </h3>
          <ul className={styles.plainList}>
            {keyResults.map((k) => (
              <li key={k.id} className={styles.milestone}>
                <span className={styles.grow}>{k.title}</span>
                <input
                  className={styles.krInput}
                  type="number"
                  aria-label={`${k.title} now`}
                  defaultValue={k.current}
                  onBlur={(e) => Number(e.target.value) !== k.current && void updateKeyResult(k.id, Number(e.target.value))}
                />
                <span className={styles.quiet}>/ {k.target}</span>
              </li>
            ))}
          </ul>
          <AddRow label="Add a key result (target number at the end, e.g. “Paying users 100”)" onAdd={(text) => {
            const m = /^(.*?)\s+(\d+(?:\.\d+)?)$/.exec(text.trim());
            return addKeyResult(goal.id, m ? m[1]! : text, m ? Number(m[2]) : 1);
          }} />
        </section>
      )}

      {links && (
        <div className={styles.tiles}>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Habits</span>
            <span className={styles.tileValue}>{links.habits.length ? links.habits.join(', ') : 'None linked'}</span>
          </div>
          <Link to="/tasks?view=anytime" className={styles.tile}>
            <span className={styles.tileLabel}>Tasks</span>
            <span className={styles.tileValue}>
              {links.openTasks} open · {links.doneTasks} done
            </span>
          </Link>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Notes</span>
            <span className={styles.tileValue}>
              {links.notes.length
                ? links.notes.slice(0, 2).map((n, i) => (
                    <span key={n.id}>
                      {i > 0 && ', '}
                      <Link to={`/library/${n.id}`}>{n.title}</Link>
                    </span>
                  ))
                : 'Mention it with @ in a page'}
            </span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Journal</span>
            <span className={styles.tileValue}>{links.journalMentions ? `${links.journalMentions} ${links.journalMentions === 1 ? 'mention' : 'mentions'}` : 'No mentions yet'}</span>
          </div>
        </div>
      )}

      <GoalForm open={editing} onClose={() => setEditing(false)} today={today} goals={board.views.map((v) => v.goal)} areas={board.areas} goal={goal} />
    </aside>
  );
}

function ProgressChart({ goalStart, goalEnd, history, today, color, stretch, title }: {
  goalStart: Day; goalEnd: Day; history: Array<{ at: string; percent: number }>; today: Day; color?: string; stretch: boolean; title: string;
}) {
  const start = dayToDate(goalStart).getTime();
  const end = dayToDate(addDays(goalEnd, 1)).getTime();
  const now = dayToDate(today).getTime();
  const last = history.at(-1)?.percent ?? 0;
  return (
    <Chart
      height={150}
      label={`${title}: progress over time against the pace line. Now ${Math.round(last)}%.`}
      option={(c) => ({
        textStyle: { fontFamily: chartFont },
        animation: false,
        grid: { left: 0, right: 8, top: 18, bottom: 22, containLabel: false },
        xAxis: {
          type: 'time',
          min: start,
          max: end,
          splitNumber: 4,
          axisLine: { lineStyle: { color: c.line } },
          axisTick: { show: false },
          axisLabel: { color: c['ink-3'], fontSize: 11, showMaxLabel: false, formatter: (v: number) => MONTHS[new Date(v).getMonth()]! },
        },
        yAxis: { type: 'value', min: 0, max: 100, show: true, splitNumber: 4, axisLabel: { show: false }, splitLine: { lineStyle: { color: c['line-soft'] } } },
        tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${Math.round(v)}%` },
        series: [
          {
            name: 'Pace',
            type: 'line',
            symbol: 'none',
            data: [[start, 0], [end, stretch ? STRETCH_WIN * 100 : 100]],
            lineStyle: { type: 'dashed', color: c['ink-4'], width: 1.5 },
            markLine: {
              symbol: 'none',
              silent: true,
              label: { formatter: 'Today', color: c['ink-3'], fontSize: 11, position: 'end' },
              lineStyle: { type: 'dotted', color: c['ink-3'] },
              data: [{ xAxis: now }],
            },
          },
          {
            name: 'Progress',
            type: 'line',
            step: false,
            symbol: 'none',
            data: history.map((p) => [new Date(p.at).getTime(), p.percent]),
            lineStyle: { color: color ? c[color as keyof typeof c] : c.primary, width: 2 },
            markPoint: {
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: { color: color ? c[color as keyof typeof c] : c.primary },
              label: { show: false },
              data: [{ coord: [now, last] }],
            },
          },
        ],
      })}
    />
  );
}

function LogValue({ goalId, value, unit, target }: { goalId: string; value: number | null; unit: string | null; target: number | null }) {
  const [text, setText] = useState(value === null ? '' : String(value));
  return (
    <form
      className={styles.logValue}
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() !== '') void logGoalValue(goalId, Number(text));
      }}
    >
      <label htmlFor="goal-value" className={styles.quiet}>
        Now
      </label>
      <input id="goal-value" type="number" step="any" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} className={styles.valueInput} />
      <span className={styles.quiet}>{target !== null ? `of ${formatAmount(target, unit)}` : unit}</span>
      <Button size="sm" type="submit" disabled={text.trim() === '' || Number(text) === value}>
        Update
      </Button>
    </form>
  );
}

function AddRow({ label, onAdd, withDate }: { label: string; onAdd: (title: string, date: Day | null) => Promise<unknown>; withDate?: boolean }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  return (
    <form
      className={styles.addRow}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        await onAdd(title.trim(), date || null);
        setTitle('');
        setDate('');
      }}
    >
      <Icon name="plus" size={14} />
      <input aria-label={label} placeholder={label} value={title} onChange={(e) => setTitle(e.target.value)} />
      {withDate && <input type="date" aria-label="Due date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.dateInput} />}
    </form>
  );
}
