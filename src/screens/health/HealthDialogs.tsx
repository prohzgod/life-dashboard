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
import { messages, useT } from '@/i18n';
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

const problem = (e: unknown) => (e instanceof HealthError ? e.message : messages().health.dialog.saveFailed);

// ---- Log a reading ----

export type LogKind = 'sleep' | 'steps' | 'weight' | 'restingHr';

export function LogDialog({ open, onClose, kind, today, onSaved }: { open: boolean; onClose: () => void; kind: LogKind; today: string; onSaved: (t: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={messages().health.dialog.logReading}>
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
  const t = useT().health.dialog;
  const LOG_LABEL = t.labels;
  const [kind, setKind] = useState<LogKind>(initial);
  const [day, setDay] = useState(today);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const unit = t.units[kind];

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (kind === 'sleep') {
        const minutes = parseSleep(value);
        if (minutes === null) return setError(t.sleepFormat);
        await logSleep(day, minutes);
      } else {
        // Steps may be typed with thousands separators (8,420); weights with a decimal comma (68,4).
        const n = Number(kind === 'steps' ? value.replace(/[,.\s]/g, '') : value.trim().replace(',', '.'));
        if (!Number.isFinite(n) || !value.trim()) return setError(t.number);
        await logSystem(kind, n, day);
      }
      onSaved(t.saved(LOG_LABEL[kind]));
      onClose();
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t.what}>
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
        <Field label={kind === 'sleep' ? t.nightBefore : t.day} hint={kind === 'sleep' ? t.wokeUp : undefined}>
          {(id) => <input id={id} type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} />}
        </Field>
        <Field label={t.value(unit)}>
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
      <p className={styles.hint}>{t.alsoCheckIn}</p>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <span className={styles.spacer} />
        <Button onClick={onClose}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {t.save}
        </Button>
      </div>
    </form>
  );
}

// ---- Workouts ----

const KINDS: Array<Workout['kind']> = ['run', 'walk', 'ride', 'swim', 'yoga', 'strength', 'other'];

export function WorkoutDialog({ open, onClose, workout, today, goal, onSaved }: { open: boolean; onClose: () => void; workout?: Workout; today: string; goal: Goal | null; onSaved: (t: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={workout ? messages().health.dialog.editWorkout : messages().health.dialog.addWorkout}>
      {open && <WorkoutForm key={workout?.id ?? 'new'} workout={workout} today={today} goal={goal} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function WorkoutForm({ workout, today, goal, onClose, onSaved }: { workout?: Workout; today: string; goal: Goal | null; onClose: () => void; onSaved: (t: string) => void }) {
  const t = useT().health.dialog;
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
  const kindInfo = t.kinds[form.kind];
  const distanceKinds = ['run', 'walk', 'ride', 'swim', 'other'];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const durationSec = parseDuration(form.duration);
    if (durationSec === null) return setError(t.duration);
    const distanceKm = form.distance.trim() ? Number(form.distance.replace(',', '.')) : null;
    if (distanceKm !== null && !Number.isFinite(distanceKm)) return setError(t.distance);
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
      onSaved(workout ? t.workoutSaved : t.added(input.title));
      onClose();
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.fieldRow}>
        <Field label={t.kind}>
          {(id) => (
            <select id={id} value={form.kind} onChange={(e) => set('kind', e.target.value as Workout['kind'])}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t.kinds[k].label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.day}>{(id) => <input id={id} type="date" value={form.day} max={today} onChange={(e) => set('day', e.target.value)} />}</Field>
      </div>
      <Field label={t.name}>{(id) => <input id={id} data-autofocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={kindInfo.title} />}</Field>
      <div className={styles.fieldRow}>
        {distanceKinds.includes(form.kind) && <Field label={t.distanceKm}>{(id) => <input id={id} inputMode="decimal" value={form.distance} onChange={(e) => set('distance', e.target.value)} placeholder="5.2" />}</Field>}
        <Field label={t.time}>{(id) => <input id={id} value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="28:40" />}</Field>
        <Field label={t.avgHr}>{(id) => <input id={id} inputMode="numeric" value={form.avgHr} onChange={(e) => set('avgHr', e.target.value)} placeholder={t.optional} />}</Field>
      </div>
      {goal && form.kind === 'run' && (
        <label className={styles.check}>
          <input type="checkbox" checked={form.counts} onChange={(e) => set('counts', e.target.checked)} />
          {t.counts(goal.title)}
        </label>
      )}
      <Field label={t.notes}>{(id) => <input id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t.optional} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {workout && (
          <Button
            variant="quiet"
            className={styles.dangerButton}
            onClick={async () => {
              await deleteWorkout(workout.id);
              onSaved(t.workoutDeleted);
              onClose();
            }}
          >
            {t.delete}
          </Button>
        )}
        <span className={styles.spacer} />
        <Button onClick={onClose}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {workout ? t.save : t.addWorkout}
        </Button>
      </div>
    </form>
  );
}

// ---- Custom metrics ----

export function MetricDialog({ open, onClose, metric, onSaved }: { open: boolean; onClose: () => void; metric?: Metric; onSaved: (t: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={metric ? messages().health.dialog.editMetric(metric.name) : messages().health.dialog.addMetricTitle}>
      {open && <MetricForm key={metric?.id ?? 'new'} metric={metric} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function MetricForm({ metric, onClose, onSaved }: { metric?: Metric; onClose: () => void; onSaved: (t: string) => void }) {
  const t = useT().health.dialog;
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
    if (target !== null && !Number.isFinite(target)) return setError(t.targetNumber);
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
      onSaved(metric ? t.savedShort : t.metricAdded(form.name.trim()));
      onClose();
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t.name}>{(id) => <input id={id} data-autofocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t.metricPlaceholder} />}</Field>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t.kind}</span>
        <Segmented
          label={t.kind}
          value={form.valueType}
          onChange={(v) => set('valueType', v)}
          options={(['number', 'scale', 'yesno'] as const).map((v) => ({ value: v, label: t.valueTypes[v] }))}
        />
      </div>
      {form.valueType === 'number' && (
        <>
          <div className={styles.fieldRow}>
            <Field label={t.unit}>{(id) => <input id={id} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder={t.unitPlaceholder} />}</Field>
            <Field label={t.step}>{(id) => <input id={id} inputMode="decimal" value={form.step} onChange={(e) => set('step', e.target.value)} />}</Field>
            <Field label={t.dailyTarget}>{(id) => <input id={id} inputMode="decimal" value={form.target} onChange={(e) => set('target', e.target.value)} placeholder={t.optional} />}</Field>
          </div>
          <Field label={t.dayCounts}>
            {(id) => (
              <select id={id} value={form.aggregation} onChange={(e) => set('aggregation', e.target.value as Metric['aggregation'])}>
                <option value="sum">{t.aggregations.sum}</option>
                <option value="average">{t.aggregations.average}</option>
                <option value="last">{t.aggregations.last}</option>
              </select>
            )}
          </Field>
        </>
      )}
      {form.valueType === 'scale' && (
        <Field label={t.dailyTarget}>{(id) => <input id={id} inputMode="numeric" value={form.target} onChange={(e) => set('target', e.target.value)} placeholder={t.scaleTarget} />}</Field>
      )}
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {metric && (
          <Button
            variant="quiet"
            className={styles.dangerButton}
            onClick={async () => {
              await removeMetric(metric.id);
              onSaved(t.metricRemoved(metric.name));
              onClose();
            }}
          >
            {t.removeMetric}
          </Button>
        )}
        <span className={styles.spacer} />
        <Button onClick={onClose}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {metric ? t.save : t.addMetric}
        </Button>
      </div>
    </form>
  );
}

/** For a 1–5 metric: pick today's value. */
export function ScaleDialog({ metric, onClose, onSaved }: { metric: Metric | null; onClose: () => void; onSaved: (t: string) => void }) {
  const t = useT().health.dialog;
  return (
    <Dialog open={Boolean(metric)} onClose={onClose} title={metric ? metric.name : t.log}>
      {metric && (
        <div className={styles.scale} role="group" aria-label={t.scaleLabel(metric.name)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              onClick={async () => {
                await logMetric(metric.id, n);
                onSaved(t.scaleSaved(metric.name, n));
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
  const t = useT().health.dialog;
  return (
    <Dialog open={open} onClose={onClose} title={t.connect}>
      <div className={styles.form}>
        <p className={styles.lead}>{t.sourceLead}</p>
        <p className={styles.lead}>{t.sourceUntil}</p>
        <div className={styles.formActions}>
          <span className={styles.spacer} />
          <Button variant="primary" onClick={onClose}>
            {t.gotIt}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
