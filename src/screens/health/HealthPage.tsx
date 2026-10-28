import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDuration, formatSleep, SLEEP_TARGET_MIN } from '@/domain/health';
import { addBedtimeHabit, loadHealth, logMetric, type HealthView, type Metric, type MetricToday, type Workout } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { formatDayShort, singular } from '@/lib/format';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useToday } from '@/lib/useToday';
import { LogDialog, MetricDialog, ScaleDialog, SourceDialog, WorkoutDialog, type LogKind } from './HealthDialogs';
import styles from './Health.module.css';

type Open = { kind: 'log'; what: LogKind } | { kind: 'workout'; workout?: Workout } | { kind: 'metric'; metric?: Metric } | { kind: 'source' } | null;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const n = (v: number) => Math.round(v).toLocaleString();

/** "−3 since June", "−1.2 kg since July", or a quieter line before there's history. */
function changeLine(change: { change: number | null; since: Date | null } | null, unit: string, decimals = 0): string {
  if (!change) return 'Not logged yet';
  if (change.change === null || !change.since) return 'First reading';
  const v = Math.abs(change.change).toFixed(decimals);
  const sign = change.change < 0 ? '−' : change.change > 0 ? '+' : '±';
  return `${sign}${v}${unit ? ` ${unit}` : ''} since ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][change.since.getMonth()]}`;
}

/** /health: sleep, steps, heart rate, weight, workouts and your own metrics, all logged on this device. */
export function HealthPage() {
  const today = useToday();
  const phone = useIsMobile();
  const data = useLiveQuery(() => loadHealth(today), [today]);
  const [open, setOpen] = useState<Open>(null);
  const [scale, setScale] = useState<Metric | null>(null);
  const [message, setMessage] = useState('');
  if (!data) return null;

  const monthName = MONTHS_SHORT[Number(today.slice(5, 7)) - 1]!;
  const w = data.workouts.month;
  const workoutLine = w.count ? [w.runKm ? `${w.runKm} km run` : null, w.byKind.yoga ? `${w.byKind.yoga} yoga` : null, w.byKind.ride ? `${w.byKind.ride} rides` : null].filter(Boolean).join(' · ') || `${w.count} logged` : 'None yet';

  async function tap(m: MetricToday) {
    if (m.metric.valueType === 'scale') return setScale(m.metric);
    await logMetric(m.metric.id, m.metric.valueType === 'yesno' ? 1 : m.metric.step);
  }

  const dialogs = (
    <>
      <LogDialog open={open?.kind === 'log'} onClose={() => setOpen(null)} kind={open?.kind === 'log' ? open.what : 'sleep'} today={today} onSaved={setMessage} />
      <WorkoutDialog open={open?.kind === 'workout'} onClose={() => setOpen(null)} workout={open?.kind === 'workout' ? open.workout : undefined} today={today} goal={data.distanceGoal} onSaved={setMessage} />
      <MetricDialog open={open?.kind === 'metric'} onClose={() => setOpen(null)} metric={open?.kind === 'metric' ? open.metric : undefined} onSaved={setMessage} />
      <ScaleDialog metric={scale} onClose={() => setScale(null)} onSaved={setMessage} />
      <SourceDialog open={open?.kind === 'source'} onClose={() => setOpen(null)} />
      {message && <Toast onDone={() => setMessage('')}>{message}</Toast>}
    </>
  );

  const sleepAvg = data.sleep.average === null ? '–' : formatSleep(data.sleep.average);
  const chart = <SleepChart nights={data.sleep.nights} compact={phone} />;

  if (phone) {
    return (
      <div className={styles.phone}>
        <header className={styles.phoneHeader}>
          <Link to="/" className={styles.phoneBack} aria-label="Back to Home">
            <Icon name="chevronLeft" size={18} />
            Home
          </Link>
          <h1 className={styles.phoneTitle}>Health</h1>
          <button type="button" className={styles.roundButton} aria-label="Log a reading" onClick={() => setOpen({ kind: 'log', what: 'sleep' })}>
            <Icon name="plus" size={20} />
          </button>
        </header>
        <div className={styles.phoneSource}>
          <button type="button" className={styles.sourceChip} onClick={() => setOpen({ kind: 'source' })}>
            Manual entries
          </button>
          <span>Never shared with the Assistant</span>
        </div>
        <section className={styles.card} aria-labelledby="phone-sleep">
          <div className={styles.cardHead}>
            <h2 id="phone-sleep" className={styles.cardTitle}>
              Sleep · 14 nights
            </h2>
            <strong>{data.sleep.average === null ? 'No nights yet' : `${sleepAvg} avg`}</strong>
          </div>
          {chart}
          <p className={styles.note}>
            {data.pattern && data.pattern.diff > 0 ? (
              <>
                After 7h+ nights you rate the next day <strong>{data.pattern.diff.toFixed(1)} higher</strong>.
              </>
            ) : (
              'Log sleep and mood for a couple of weeks and a pattern shows here.'
            )}
          </p>
        </section>
        <div className={styles.phoneTiles}>
          <Tile label="Steps" value={data.steps.average === null ? '–' : n(data.steps.average)} unit={data.steps.average === null ? '' : 'avg'} note={data.steps.today === null ? 'Not logged today' : `today ${n(data.steps.today)}`} onClick={() => setOpen({ kind: 'log', what: 'steps' })} />
          <Tile label="Resting HR" value={data.restingHr ? n(data.restingHr.latest) : '–'} unit="bpm" note={changeLine(data.restingHr, '')} onClick={() => setOpen({ kind: 'log', what: 'restingHr' })} />
          <Tile label="Weight" value={data.weight ? data.weight.latest.toFixed(1) : '–'} unit="kg" note={changeLine(data.weight, '', 1)} onClick={() => setOpen({ kind: 'log', what: 'weight' })} />
          <Tile label="Workouts" value={String(w.count)} unit={`in ${monthName}`} note={w.runKm ? `${w.runKm} km run` : 'Tap to add one'} onClick={() => setOpen({ kind: 'workout' })} />
        </div>
        <section className={styles.card} aria-labelledby="quick-log">
          <div className={styles.cardHead}>
            <h2 id="quick-log" className={styles.cardTitle}>
              Quick log
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'metric' })}>
              Add metric
            </button>
          </div>
          {data.metrics.length === 0 && <p className={styles.quiet}>Track anything with a tap: water, coffee, how your knee feels.</p>}
          <ul className={styles.quickLog}>
            {data.metrics.map((m) => (
              <MetricRow key={m.metric.id} m={m} onTap={() => tap(m)} onEdit={() => setOpen({ kind: 'metric', metric: m.metric })} compact />
            ))}
          </ul>
        </section>
        {dialogs}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Health</h1>
            <span className={styles.moduleChip}>Optional module</span>
          </div>
          <span className={styles.privacyNote}>
            <Icon name="lock" size={13} />
            Stays on this device. The Assistant can’t read it unless you allow it.
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.sourceChip} onClick={() => setOpen({ kind: 'log', what: 'sleep' })}>
            <span className={styles.dot} aria-hidden="true" />
            Manual entries · log a reading
          </button>
          <button type="button" className={styles.connect} onClick={() => setOpen({ kind: 'source' })}>
            <Icon name="plus" size={14} />
            Connect a source
          </button>
        </div>
      </header>

      <div className={styles.stats}>
        <Tile label="Sleep · 14-night avg" value={sleepAvg} note={data.sleep.logged ? `target 7h · met ${data.sleep.met} of ${data.sleep.logged}` : 'Log last night to start'} onClick={() => setOpen({ kind: 'log', what: 'sleep' })} big />
        <Tile label="Steps · daily avg" value={data.steps.average === null ? '–' : n(data.steps.average)} note={data.steps.today === null ? 'Nothing logged today' : `today ${n(data.steps.today)} so far`} onClick={() => setOpen({ kind: 'log', what: 'steps' })} big />
        <Tile label="Resting heart rate" value={data.restingHr ? n(data.restingHr.latest) : '–'} unit="bpm" note={changeLine(data.restingHr, '')} onClick={() => setOpen({ kind: 'log', what: 'restingHr' })} big />
        <Tile label="Weight" value={data.weight ? data.weight.latest.toFixed(1) : '–'} unit="kg" note={changeLine(data.weight, 'kg', 1)} onClick={() => setOpen({ kind: 'log', what: 'weight' })} big />
        <Tile label={`Workouts · ${monthName}`} value={String(w.count)} note={workoutLine} onClick={() => setOpen({ kind: 'workout' })} big />
      </div>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="sleep-title">
          <div className={styles.cardHead}>
            <h2 id="sleep-title" className={styles.cardTitle}>
              Sleep, last 14 nights
            </h2>
            <span className={styles.legend}>
              <span className={cx(styles.swatch, styles.rested)} aria-hidden="true" /> 7h or more
              <span className={cx(styles.swatch, styles.short)} aria-hidden="true" /> under 7h
            </span>
          </div>
          {chart}
        </section>

        <section className={styles.card} aria-labelledby="mood-title">
          <h2 id="mood-title" className={styles.cardTitle}>
            Sleep and next-day mood
          </h2>
          <MoodPattern
            data={data}
            onHabit={async () => {
              await addBedtimeHabit();
              setMessage('Added “In bed by 23:00” to your habits on Today.');
            }}
          />
        </section>
      </div>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="workouts-title">
          <div className={styles.cardHead}>
            <h2 id="workouts-title" className={styles.cardTitle}>
              Workouts
            </h2>
            <span className={styles.cardActions}>
              {data.distanceGoal && (
                <Link to={`/goals/${data.distanceGoal.id}`} className={styles.textLink}>
                  Counts toward: {data.distanceGoal.title}
                </Link>
              )}
              <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'workout' })}>
                Add workout
              </button>
            </span>
          </div>
          {data.workouts.recent.length === 0 ? (
            <p className={styles.quiet}>Log a run, a walk or a yoga class. Runs can count toward a goal measured in km.</p>
          ) : (
            <table className={styles.table}>
              <caption className="visually-hidden">Recent workouts</caption>
              <thead className="visually-hidden">
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Workout</th>
                  <th scope="col">Distance</th>
                  <th scope="col">Time</th>
                  <th scope="col">Heart rate</th>
                </tr>
              </thead>
              <tbody>
                {data.workouts.recent.map((wk) => (
                  <tr key={wk.id}>
                    <td className={styles.muted}>{formatDayShort(wk.day).replace(/ \w+$/, '')}</td>
                    <td>
                      <button type="button" className={styles.rowButton} onClick={() => setOpen({ kind: 'workout', workout: wk })}>
                        {wk.title}
                      </button>
                    </td>
                    <td className={styles.num}>{wk.distanceKm ? `${wk.distanceKm} km` : '–'}</td>
                    <td className={styles.num}>{formatDuration(wk.durationSec)}</td>
                    <td className={styles.muted}>{wk.avgHr ? `avg ${wk.avgHr} bpm` : wk.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.card} aria-labelledby="metrics-title">
          <div className={styles.cardHead}>
            <h2 id="metrics-title" className={styles.cardTitle}>
              Your metrics
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'metric' })}>
              + Add metric
            </button>
          </div>
          {data.metrics.length === 0 && <p className={styles.quiet}>Nothing yet. Water, coffee, how your knee feels: anything you want to count.</p>}
          <ul className={styles.metrics}>
            {data.metrics.map((m) => (
              <MetricRow key={m.metric.id} m={m} onTap={() => tap(m)} onEdit={() => setOpen({ kind: 'metric', metric: m.metric })} />
            ))}
          </ul>
          <p className={styles.note}>Any number, scale or yes/no. Metrics can power habits and goals.</p>
        </section>
      </div>
      {dialogs}
    </div>
  );
}

function Tile({ label, value, unit, note, onClick, big = false }: { label: string; value: string; unit?: string; note: string; onClick: () => void; big?: boolean }) {
  return (
    <button type="button" className={cx(styles.tile, big && styles.tileBig)} onClick={onClick}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>
        {value}
        {unit && <span className={styles.tileUnit}> {unit}</span>}
      </span>
      <span className={styles.tileNote}>{note}</span>
    </button>
  );
}

function SleepChart({ nights, compact }: { nights: HealthView['sleep']['nights']; compact: boolean }) {
  const max = Math.max(9 * 60, ...nights.map((x) => x.minutes ?? 0));
  return (
    <figure className={cx(styles.chart, compact && styles.chartCompact)}>
      <span className={styles.target} style={{ bottom: `${(SLEEP_TARGET_MIN / max) * 100}%` }} aria-hidden="true">
        {!compact && <span className={styles.targetLabel}>7h target</span>}
      </span>
      <ol className={styles.bars} aria-label="Sleep per night">
        {nights.map((night, i) => (
          <li key={night.day} className={styles.barSlot}>
            <span
              className={cx(styles.bar, night.minutes === null ? styles.none : night.minutes >= SLEEP_TARGET_MIN ? styles.rested : styles.short)}
              style={{ height: `${night.minutes === null ? 3 : (night.minutes / max) * 100}%` }}
              aria-hidden="true"
            />
            {!compact && <span className={cx(styles.barLabel, i === nights.length - 1 && styles.strong)}>{night.label}</span>}
            <span className="visually-hidden">
              {formatDayShort(night.day)}: {night.minutes === null ? 'not logged' : formatSleep(night.minutes)}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function MoodPattern({ data, onHabit }: { data: HealthView; onHabit: () => void }) {
  const p = data.pattern;
  if (!p) return <p className={styles.quiet}>Log your sleep and mood for a couple of weeks (at least five nights of each kind) and the pattern shows here.</p>;
  const better = p.diff > 0;
  return (
    <>
      <p className={styles.lead}>
        After nights of 7 hours or more, you rated the next day{' '}
        <strong>
          {Math.abs(p.diff).toFixed(1)} {better ? 'higher' : 'lower'}
        </strong>
        .
      </p>
      <dl className={styles.moodBars}>
        <div>
          <dt>7h or more</dt>
          <dd>
            <span className={styles.moodTrack} aria-hidden="true">
              <span className={styles.rested} style={{ width: `${(p.rested / 5) * 100}%` }} />
            </span>
            <strong>{p.rested.toFixed(1)}</strong>
          </dd>
        </div>
        <div>
          <dt>under 7h</dt>
          <dd>
            <span className={styles.moodTrack} aria-hidden="true">
              <span className={styles.short} style={{ width: `${(p.short / 5) * 100}%` }} />
            </span>
            <strong>{p.short.toFixed(1)}</strong>
          </dd>
        </div>
      </dl>
      <p className={styles.note}>Based on {p.restedDays + p.shortDays} nights. A pattern, not a diagnosis.</p>
      {better &&
        (data.hasBedtimeHabit ? (
          <p className={styles.note}>You’re already working on “In bed by 23:00”.</p>
        ) : (
          <Button size="sm" className={styles.selfStart} onClick={onHabit}>
            Add “in bed by 23:00” habit
          </Button>
        ))}
    </>
  );
}

function MetricRow({ m, onTap, onEdit, compact = false }: { m: MetricToday; onTap: () => void; onEdit: () => void; compact?: boolean }) {
  const { metric, today, lastTime } = m;
  const value =
    metric.valueType === 'yesno'
      ? today
        ? 'Done today'
        : 'Not yet today'
      : metric.valueType === 'scale'
        ? today === null
          ? 'Not logged today'
          : `${today.toFixed(today % 1 ? 1 : 0)} / 5`
        : `${today === null ? 0 : Math.round(today * 10) / 10}${metric.target ? ` / ${metric.target}` : ''}${metric.unit && (!compact || !metric.target) ? ` ${metric.unit}` : ''}${!metric.target && lastTime && !compact ? ` · last ${lastTime}` : ''}`;
  const unit = metric.unit ? ` ${metric.step === 1 ? singular(metric.unit) : metric.unit}` : '';
  const tapLabel = metric.valueType === 'number' ? `Add ${metric.step}${unit} to ${metric.name}` : `Log ${metric.name}`;
  return (
    <li className={styles.metric}>
      <button type="button" className={styles.metricName} onClick={onEdit} aria-label={`Edit ${metric.name}`}>
        {metric.name}
      </button>
      <span className={styles.metricValue}>{value}</span>
      <button type="button" className={styles.plus} aria-label={tapLabel} onClick={onTap}>
        <Icon name="plus" size={16} strokeWidth={2.2} />
      </button>
    </li>
  );
}

