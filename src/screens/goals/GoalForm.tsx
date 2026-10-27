import { useId, useState, type FormEvent } from 'react';
import type { Day } from '@/domain/days';
import { horizonDates } from '@/domain/goals';
import { createGoal, updateGoal, type Goal, type GoalInput, type LifeArea } from '@/data';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { METHOD_LABELS } from '@/lib/goalText';
import styles from './Goals.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  today: Day;
  goals: Goal[];
  areas: LifeArea[];
  /** Editing this goal; otherwise a new one. */
  goal?: Goal;
  onCreated?: (id: string) => void;
};

type Horizon = Exclude<Goal['horizon'], 'vision'>;

const TYPE_FOR_METHOD: Record<Goal['progressMethod'], Goal['type']> = {
  metric: 'target',
  milestones: 'milestone',
  taskCount: 'target',
  weightedTasks: 'target',
  keyResultAverage: 'okr',
  habitConsistency: 'habit',
  manual: 'qualitative',
  childRollup: 'target',
};

export function GoalForm({ open, onClose, today, goals, areas, goal, onCreated }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      {open && <FormBody key={goal?.id ?? 'new'} today={today} goals={goals} areas={areas} goal={goal} onDone={(id) => {
        onClose();
        if (!goal && id) onCreated?.(id);
      }} />}
    </Dialog>
  );
}

function FormBody({ today, goals, areas, goal, onDone }: { today: Day; goals: Goal[]; areas: LifeArea[]; goal?: Goal; onDone: (id?: string) => void }) {
  const id = useId();
  const initialHorizon: Horizon = goal && goal.horizon !== 'vision' ? goal.horizon : 'year';
  const [form, setForm] = useState({
    title: goal?.title ?? '',
    why: goal?.why ?? '',
    areaId: goal?.areaId ?? '',
    parentGoalId: goal?.parentGoalId ?? '',
    horizon: initialHorizon,
    progressMethod: goal?.progressMethod ?? ('metric' as Goal['progressMethod']),
    startValue: goal?.startValue?.toString() ?? '0',
    targetValue: goal?.targetValue?.toString() ?? '',
    unit: goal?.unit ?? '',
    ...(goal ? { startDate: goal.startDate, endDate: goal.endDate } : horizonDates(initialHorizon, today)),
    stretch: goal?.commitment === 'aspirational',
  });
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const parents = goals.filter((g) => g.id !== goal?.id && g.status !== 'dropped' && g.horizon !== 'week');
  const measured = form.progressMethod === 'metric';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Give the goal a name.');
    if (form.endDate < form.startDate) return setError('The end date comes before the start.');
    if (measured && (form.targetValue === '' || Number(form.targetValue) === Number(form.startValue))) return setError('Set a target different from where you start.');
    const input: GoalInput = {
      title: form.title.trim(),
      why: form.why.trim(),
      areaId: form.areaId || null,
      parentGoalId: form.parentGoalId || null,
      horizon: form.horizon,
      type: TYPE_FOR_METHOD[form.progressMethod],
      progressMethod: form.progressMethod,
      startValue: measured ? Number(form.startValue || 0) : form.progressMethod === 'manual' ? 0 : null,
      targetValue: measured ? Number(form.targetValue) : form.progressMethod === 'manual' ? 100 : null,
      unit: measured ? form.unit.trim() || null : null,
      startDate: form.startDate,
      endDate: form.endDate,
      commitment: form.stretch ? 'aspirational' : 'committed',
    };
    if (goal) {
      await updateGoal(goal.id, input);
      onDone();
    } else {
      onDone((await createGoal(input)).id);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-goal`}>Goal</label>
        <input id={`${id}-goal`} data-autofocus autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Run a half-marathon" />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-why-it-matters`}>Why it matters</label>
        <textarea id={`${id}-why-it-matters`} rows={2} value={form.why} onChange={(e) => set('why', e.target.value)} placeholder="The reason you’ll remember on a hard day" />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-area`}>Area</label>
          <select id={`${id}-area`} value={form.areaId} onChange={(e) => set('areaId', e.target.value)}>
            <option value="">No area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-part-of`}>Part of</label>
          <select id={`${id}-part-of`} value={form.parentGoalId} onChange={(e) => set('parentGoalId', e.target.value)}>
            <option value="">Nothing bigger</option>
            {parents.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-horizon`}>Horizon</label>
          <select
            id={`${id}-horizon`}
            value={form.horizon}
            onChange={(e) => {
              const horizon = e.target.value as Horizon;
              setForm((f) => ({ ...f, horizon, ...horizonDates(horizon, today) }));
            }}
          >
            <option value="year">This year</option>
            <option value="quarter">This quarter</option>
            <option value="month">This month</option>
            <option value="week">This week</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-starts`}>Starts</label>
          <input id={`${id}-starts`} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-ends`}>Ends</label>
          <input id={`${id}-ends`} type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-how-progress-is-measured`}>How progress is measured</label>
        <select id={`${id}-how-progress-is-measured`} value={form.progressMethod} onChange={(e) => set('progressMethod', e.target.value as Goal['progressMethod'])}>
          {(Object.keys(METHOD_LABELS) as Array<Goal['progressMethod']>).map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      {measured && (
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor={`${id}-from`}>From</label>
            <input id={`${id}-from`} type="number" step="any" value={form.startValue} onChange={(e) => set('startValue', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-to`}>To</label>
            <input id={`${id}-to`} type="number" step="any" value={form.targetValue} onChange={(e) => set('targetValue', e.target.value)} placeholder="21.1" />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-unit`}>Unit</label>
            <input id={`${id}-unit`} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="km, $, books" />
          </div>
        </div>
      )}
      <label className={styles.check}>
        <input type="checkbox" checked={form.stretch} onChange={(e) => set('stretch', e.target.checked)} />
        <span>
          Stretch goal <span className={styles.quietInline}>(reaching 60–70% counts as a win)</span>
        </span>
      </label>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        <Button onClick={() => onDone()}>Cancel</Button>
        <Button type="submit" variant="primary">
          {goal ? 'Save' : 'Create goal'}
        </Button>
      </div>
    </form>
  );
}
