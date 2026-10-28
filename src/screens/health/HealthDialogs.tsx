import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { formatDuration, parseDuration } from '@/domain/health';
import {
  addMetric,
  addWorkout,
  deleteWorkout,
  HealthError,
  logMetric,
  logSleep,
  logSystem,
  removeMetric,
  updateMetric,
  updateWorkout,
  type Goal,
  type Metric,
  type Workout,
} from '@/data';
import { Button, Segmented } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import styles from './Health.module.css';

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return text ? (
    <p className={styles.formError} role="alert">
      {text}
    </p>
  ) : null;
}

const problem = (e: unknown) => (e instanceof HealthError ? e.message : 'That didn’t save. Try again.');

// ---- Log a reading ----

export type LogKind = 'sleep' | 'steps' | 'weight' | 'restingHr';

const LOG_LABEL: Record<LogKind, string> = { sleep: 'Sleep', steps: 'Steps', weight: 'Weight', restingHr: 'Resting heart rate' };

export function LogDialog({ open, onClose, kind, today, onSaved }: { open: boolean; onClose: () => void; kind: LogKind; today: string; onSaved: (t: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Log a reading">
      {open && <LogForm key={kind} initial={kind} today={today} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

/** "7h 30m", "7:30", "7.5" → minutes. */
function parseSleep(text: string): number | null {
  const t = text.trim().toLowerCase();
  const hm = /^(\d{1,2})\s*h(?:\s*(\d{1,2})\s*m?)?$/.exec(t) ?? /^(\d{1,2}):(\d{2})$/.exec(t);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0);
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null;
}

function LogForm({ initial, today, onClose, onSaved }: { initial: LogKind; today: string; onClose: () => void; onSaved: (t: string) => void }) {
  const [kind, setKind] = useState<LogKind>(initial);
  const [day, setDay] = useState(today);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const unit = { sleep: 'hours', steps: 'steps', weight: 'kg', restingHr: 'bpm' }[kind];

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (kind === 'sleep') {
        const minutes = parseSleep(value);
        if (minutes === null) return setError('Write it like 7h 30m, 7:30 or 7.5.');
        await logSleep(day, minutes);
      } else {
        // Steps may be typed with thousands separators (8,420); weights with a decimal comma (68,4).
        const n = Number(kind === 'steps' ? value.replace(/[,.\s]/g, '') : value.trim().replace(',', '.'));
        if (!Number.isFinite(n) || !value.trim()) return setError('Enter a number.');
        await logSystem(kind, n, day);
      }
      onSaved(`${LOG_LABEL[kind]} saved.`);
      onClose();
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label="What">
        {(id) => (
          <select id={id} value={kind} onChange={(e) => setKind(e.target.value as LogKind)}>
            {(Object.keys(LOG_LABEL) as LogKind[]).map((k) => (
              <option key={k} value={k}>
                {LOG_LABEL[k]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className={styles.fieldRow}>
        <Field label={kind === 'sleep' ? 'Night before' : 'Day'} hint={kind === 'sleep' ? 'The day you woke up.' : undefined}>
          {(id) => <input id={id} type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} />}
        </Field>
        <Field label={`Value (${unit})`}>
          {(id) => (
            <input
              id={id}
              data-autofocus
              inputMode={kind === 'sleep' ? 'text' : 'decimal'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={{ sleep: '7h 30m', steps: '8420', weight: '68.4', restingHr: '58' }[kind]}
            />
          )}
        </Field>
      </div>
      <p className={styles.hint}>Sleep is also part of your daily check-in on Today.</p>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}

// ---- Workouts ----

const KINDS: Array<{ value: Workout['kind']; label: string; title: string }> = [
  { value: 'run', label: 'Run', title: 'Easy run' },
  { value: 'walk', label: 'Walk', title: 'Walk' },
  { value: 'ride', label: 'Ride', title: 'Ride' },
  { value: 'swim', label: 'Swim', title: 'Swim' },
  { value: 'yoga', label: 'Yoga', title: 'Yoga' },
  { value: 'strength', label: 'Strength', title: 'Strength' },
  { value: 'other', label: 'Other', title: 'Workout' },
];

export function WorkoutDialog({ open, onClose, workout, today, goal, onSaved }: { open: boolean; onClose: () => void; workout?: Workout; today: string; goal: Goal | null; onSaved: (t: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={workout ? 'Edit workout' : 'Add workout'}>
      {open && <WorkoutForm key={workout?.id ?? 'new'} workout={workout} today={today} goal={goal} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function WorkoutForm({ workout, today, goal, onClose, onSaved }: { workout?: Workout; today: string; goal: Goal | null; onClose: () => void; onSaved: (t: string) => void }) {
  const [form, setForm] = useState({
    kind: workout?.kind ?? ('run' as Workout['kind']),
    title: workout?.title ?? '',
    day: workout?.day ?? today,
    distance: workout?.distanceKm?.toString() ?? '',
    duration: workout ? formatDuration(workout.durationSec) : '',
    avgHr: workout?.avgHr?.toString() ?? '',
    counts: workout ? Boolean(workout.goalId) : Boolean(goal),
    notes: workout?.notes ?? '',
  });
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const kindInfo = KINDS.find((k) => k.value === form.kind)!;
  const distanceKinds = ['run', 'walk', 'ride', 'swim', 'other'];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const durationSec = parseDuration(form.duration);
    if (durationSec === null) return setError('Enter how long it took, like 28:40 or 45 (minutes).');
    const distanceKm = form.distance.trim() ? Number(form.distance.replace(',', '.')) : null;
    if (distanceKm !== null && !Number.isFinite(distanceKm)) return setError('Distance is a number of km, like 5.2.');
    const avgHr = form.avgHr.trim() ? Math.round(Number(form.avgHr)) : null;
    const input = {
      day: form.day,
      kind: form.kind,
      title: form.title.trim() || kindInfo.title,
      distanceKm,
      durationSec,
      avgHr: avgHr && Number.isFinite(avgHr) ? avgHr : null,
      goalId: form.counts && goal && form.kind === 'run' ? goal.id : null,
      notes: form.notes,
    };
    try {
      if (workout) await updateWorkout(workout.id, input);
      else await addWorkout(input);
      onSaved(workout ? 'Workout saved.' : `${input.title} added.`);
      onClose();
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.fieldRow}>
        <Field label="Kind">
          {(id) => (
            <select id={id} value={form.kind} onChange={(e) => set('kind', e.target.value as Workout['kind'])}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Day">{(id) => <input id={id} type="date" value={form.day} max={today} onChange={(e) => set('day', e.target.value)} />}</Field>
      </div>
      <Field label="Name">{(id) => <input id={id} data-autofocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={kindInfo.title} />}</Field>
      <div className={styles.fieldRow}>
        {distanceKinds.includes(form.kind) && <Field label="Distance (km)">{(id) => <input id={id} inputMode="decimal" value={form.distance} onChange={(e) => set('distance', e.target.value)} placeholder="5.2" />}</Field>}
        <Field label="Time">{(id) => <input id={id} value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="28:40" />}</Field>
        <Field label="Avg heart rate">{(id) => <input id={id} inputMode="numeric" value={form.avgHr} onChange={(e) => set('avgHr', e.target.value)} placeholder="Optional" />}</Field>
      </div>
      {goal && form.kind === 'run' && (
        <label className={styles.check}>
          <input type="checkbox" checked={form.counts} onChange={(e) => set('counts', e.target.checked)} />
          Counts toward “{goal.title}” (your longest run is its progress)
        </label>
      )}
      <Field label="Notes">{(id) => <input id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {workout && (
          <Button
            variant="quiet"
            className={styles.dangerButton}
            onClick={async () => {
              await deleteWorkout(workout.id);
              onSaved('Workout deleted.');
              onClose();
            }}
          >
            Delete
          </Button>
        )}
        <span className={styles.spacer} />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">
          {workout ? 'Save' : 'Add workout'}
        </Button>
      </div>
    </form>
  );
}

// ---- Custom metrics ----

export function MetricDialog({ open, onClose, metric, onSaved }: { open: boolean; onClose: () => void; metric?: Metric; onSaved: (t: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={metric ? `Edit ${metric.name}` : 'Add a metric'}>
      {open && <MetricForm key={metric?.id ?? 'new'} metric={metric} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function MetricForm({ metric, onClose, onSaved }: { metric?: Metric; onClose: () => void; onSaved: (t: string) => void }) {
  const [form, setForm] = useState({
    name: metric?.name ?? '',
    valueType: metric?.valueType ?? ('number' as Metric['valueType']),
    unit: metric?.unit ?? '',
    target: metric?.target?.toString() ?? '',
    step: metric?.step?.toString() ?? '1',
    aggregation: metric?.aggregation ?? ('sum' as Metric['aggregation']),
  });
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const target = form.target.trim() ? Number(form.target) : null;
    const step = Number(form.step || 1);
    if (target !== null && !Number.isFinite(target)) return setError('The daily target is a number.');
    const input = {
      name: form.name,
      valueType: form.valueType,
      unit: form.valueType === 'number' ? form.unit : null,
      target: form.valueType === 'yesno' ? 1 : target,
      step: form.valueType === 'number' ? step : 1,
      aggregation: form.valueType === 'number' ? form.aggregation : form.valueType === 'scale' ? ('average' as const) : ('last' as const),
    };
    try {
      if (metric) await updateMetric(metric.id, input);
      else await addMetric(input);
      onSaved(metric ? 'Saved.' : `${form.name.trim()} added. Tap + to log it.`);
      onClose();
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label="Name">{(id) => <input id={id} data-autofocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Water" />}</Field>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Kind</span>
        <Segmented
          label="Kind"
          value={form.valueType}
          onChange={(v) => set('valueType', v)}
          options={[
            { value: 'number', label: 'A number' },
            { value: 'scale', label: 'A 1–5 scale' },
            { value: 'yesno', label: 'Yes or no' },
          ]}
        />
      </div>
      {form.valueType === 'number' && (
        <>
          <div className={styles.fieldRow}>
            <Field label="Unit">{(id) => <input id={id} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="glasses" />}</Field>
            <Field label="Each tap adds">{(id) => <input id={id} inputMode="decimal" value={form.step} onChange={(e) => set('step', e.target.value)} />}</Field>
            <Field label="Daily target">{(id) => <input id={id} inputMode="decimal" value={form.target} onChange={(e) => set('target', e.target.value)} placeholder="Optional" />}</Field>
          </div>
          <Field label="A day counts">
            {(id) => (
              <select id={id} value={form.aggregation} onChange={(e) => set('aggregation', e.target.value as Metric['aggregation'])}>
                <option value="sum">The total of the day</option>
                <option value="average">The average of the day</option>
                <option value="last">The last reading</option>
              </select>
            )}
          </Field>
        </>
      )}
      {form.valueType === 'scale' && (
        <Field label="Daily target">{(id) => <input id={id} inputMode="numeric" value={form.target} onChange={(e) => set('target', e.target.value)} placeholder="Optional, 1 to 5" />}</Field>
      )}
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {metric && (
          <Button
            variant="quiet"
            className={styles.dangerButton}
            onClick={async () => {
              await removeMetric(metric.id);
              onSaved(`${metric.name} removed. Its entries are kept.`);
              onClose();
            }}
          >
            Remove metric
          </Button>
        )}
        <span className={styles.spacer} />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">
          {metric ? 'Save' : 'Add metric'}
        </Button>
      </div>
    </form>
  );
}

/** For a 1–5 metric: pick today's value. */
export function ScaleDialog({ metric, onClose, onSaved }: { metric: Metric | null; onClose: () => void; onSaved: (t: string) => void }) {
  return (
    <Dialog open={Boolean(metric)} onClose={onClose} title={metric ? metric.name : 'Log'}>
      {metric && (
        <div className={styles.scale} role="group" aria-label={`${metric.name}, 1 to 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              onClick={async () => {
                await logMetric(metric.id, n);
                onSaved(`${metric.name}: ${n} of 5.`);
                onClose();
              }}
            >
              {n}
            </Button>
          ))}
        </div>
      )}
    </Dialog>
  );
}

/** Sources come with the phone app; until then, say so plainly. */
export function SourceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Connect a source">
      <div className={styles.form}>
        <p className={styles.lead}>Apple Health and Health Connect need a phone app to read them, and that app isn’t ready yet. When it is, your sleep, steps, heart rate and workouts come in by themselves, on your devices only.</p>
        <p className={styles.lead}>Until then, log readings by hand here, and sleep in your daily check-in.</p>
        <div className={styles.formActions}>
          <span className={styles.spacer} />
          <Button variant="primary" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
