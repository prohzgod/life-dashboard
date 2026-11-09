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
import { intlLocale, messages, useT } from '@/i18n';
import styles from './Health.module.css';

type Open = { kind: 'log'; what: LogKind } | { kind: 'workout'; workout?: Workout } | { kind: 'metric'; metric?: Metric } | { kind: 'source' } | null;

const n = (v: number) => Math.round(v).toLocaleString(intlLocale());

/** "−3 since June", "−1.2 kg since July", or a quieter line before there's history. */
function changeLine(change: { change: number | null; since: Date | null } | null, unit: string, decimals = 0): string {
  const { calendar, health } = messages();
  if (!change) return health.notLogged;
  if (change.change === null || !change.since) return health.firstReading;
  const v = Math.abs(change.change).toFixed(decimals);
  const sign = change.change < 0 ? '−' : change.change > 0 ? '+' : '±';
  return health.since(`${sign}${v}${unit ? ` ${unit}` : ''}`, calendar.monthName(change.since));
}

/** /health: sleep, steps, heart rate, weight, workouts and your own metrics, all logged on this device. */
export function HealthPage() {
  const { format, health: t, seed, shell } = useT();
  const today = useToday();
  const phone = useIsMobile();
  const data = useLiveQuery(() => loadHealth(today), [today]);
  const [open, setOpen] = useState<Open>(null);
  const [scale, setScale] = useState<Metric | null>(null);
  const [message, setMessage] = useState('');
  if (!data) return null;

  const monthName = format.monthsShort[Number(today.slice(5, 7)) - 1]!;
  const w = data.workouts.month;
  const workoutLine = w.count ? [w.runKm ? t.runKm(w.runKm) : null, w.byKind.yoga ? t.yoga(w.byKind.yoga) : null, w.byKind.ride ? t.rides(w.byKind.ride) : null].filter(Boolean).join(', ') || t.logged(w.count) : t.noneYet;

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
          <Link to="/menu" className={styles.phoneBack} aria-label={shell.backTo(shell.menu)}>
            <Icon name="chevronLeft" size={18} />
            {shell.menu}
          </Link>
          <h1 className={styles.phoneTitle}>{t.title}</h1>
          <button type="button" className={styles.roundButton} aria-label={t.logReading} onClick={() => setOpen({ kind: 'log', what: 'sleep' })}>
            <Icon name="plus" size={20} />
          </button>
        </header>
        <div className={styles.phoneSource}>
          <button type="button" className={styles.sourceChip} onClick={() => setOpen({ kind: 'source' })}>
            {t.manual}
          </button>
          <span>{t.neverShared}</span>
        </div>
        <section className={styles.card} aria-labelledby="phone-sleep">
          <div className={styles.cardHead}>
            <h2 id="phone-sleep" className={styles.cardTitle}>
              {t.sleep14}
            </h2>
            <strong>{data.sleep.average === null ? t.noNights : t.avg(sleepAvg)}</strong>
          </div>
          {chart}
          <p className={styles.note}>
            {data.pattern && data.pattern.diff > 0 ? (
              <>
                {t.afterRested} <strong>{t.higherBy(data.pattern.diff.toFixed(1))}</strong>.
              </>
            ) : (
              t.patternLater
            )}
          </p>
        </section>
        <div className={styles.phoneTiles}>
          <Tile label={t.steps} value={data.steps.average === null ? '–' : n(data.steps.average)} unit={data.steps.average === null ? '' : t.avgUnit} note={data.steps.today === null ? t.notToday : t.todayValue(n(data.steps.today))} onClick={() => setOpen({ kind: 'log', what: 'steps' })} />
          <Tile label={t.restingHrShort} value={data.restingHr ? n(data.restingHr.latest) : '–'} unit="bpm" note={changeLine(data.restingHr, '')} onClick={() => setOpen({ kind: 'log', what: 'restingHr' })} />
          <Tile label={t.weight} value={data.weight ? data.weight.latest.toFixed(1) : '–'} unit="kg" note={changeLine(data.weight, '', 1)} onClick={() => setOpen({ kind: 'log', what: 'weight' })} />
          <Tile label={t.workouts} value={String(w.count)} unit={t.inMonth(monthName)} note={w.runKm ? t.runKm(w.runKm) : t.tapToAdd} onClick={() => setOpen({ kind: 'workout' })} />
        </div>
        <section className={styles.card} aria-labelledby="quick-log">
          <div className={styles.cardHead}>
            <h2 id="quick-log" className={styles.cardTitle}>
              {t.quickLog}
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'metric' })}>
              {t.addMetric}
            </button>
          </div>
          {data.metrics.length === 0 && <p className={styles.quiet}>{t.quickEmpty}</p>}
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
            <h1 className={styles.title}>{t.title}</h1>
          </div>
          <span className={styles.privacyNote}>
            <Icon name="lock" size={13} />
            {t.privacy}
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.sourceChip} onClick={() => setOpen({ kind: 'log', what: 'sleep' })}>
            <span className={styles.dot} aria-hidden="true" />
            {t.manualLog}
          </button>
          <button type="button" className={styles.connect} onClick={() => setOpen({ kind: 'source' })}>
            <Icon name="plus" size={14} />
            {t.connect}
          </button>
        </div>
      </header>

      <div className={styles.stats}>
        <Tile label={t.sleepAvg} value={sleepAvg} note={data.sleep.logged ? t.sleepMet(data.sleep.met, data.sleep.logged) : t.logLastNight} onClick={() => setOpen({ kind: 'log', what: 'sleep' })} big />
        <Tile label={t.stepsAvg} value={data.steps.average === null ? '–' : n(data.steps.average)} note={data.steps.today === null ? t.nothingToday : t.todaySoFar(n(data.steps.today))} onClick={() => setOpen({ kind: 'log', what: 'steps' })} big />
        <Tile label={t.restingHr} value={data.restingHr ? n(data.restingHr.latest) : '–'} unit="bpm" note={changeLine(data.restingHr, '')} onClick={() => setOpen({ kind: 'log', what: 'restingHr' })} big />
        <Tile label={t.weight} value={data.weight ? data.weight.latest.toFixed(1) : '–'} unit="kg" note={changeLine(data.weight, 'kg', 1)} onClick={() => setOpen({ kind: 'log', what: 'weight' })} big />
        <Tile label={t.workoutsIn(monthName)} value={String(w.count)} note={workoutLine} onClick={() => setOpen({ kind: 'workout' })} big />
      </div>

      <div className={styles.split}>
        <section className={styles.card} aria-labelledby="sleep-title">
          <div className={styles.cardHead}>
            <h2 id="sleep-title" className={styles.cardTitle}>
              {t.sleepLast14}
            </h2>
            <span className={styles.legend}>
              <span className={cx(styles.swatch, styles.rested)} aria-hidden="true" /> {t.rested}
              <span className={cx(styles.swatch, styles.short)} aria-hidden="true" /> {t.short}
            </span>
          </div>
          {chart}
        </section>

        <section className={styles.card} aria-labelledby="mood-title">
          <h2 id="mood-title" className={styles.cardTitle}>
            {t.moodTitle}
          </h2>
          <MoodPattern
            data={data}
            onHabit={async () => {
              await addBedtimeHabit();
              setMessage(t.bedtimeAdded(seed.bedtime.title));
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
                  {t.countsToward(data.distanceGoal.title)}
                </Link>
              )}
              <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'workout' })}>
                {t.addWorkout}
              </button>
            </span>
          </div>
          {data.workouts.recent.length === 0 ? (
            <p className={styles.quiet}>{t.workoutsEmpty}</p>
          ) : (
            <table className={styles.table}>
              <caption className="visually-hidden">{t.recentWorkouts}</caption>
              <thead className="visually-hidden">
                <tr>
                  <th scope="col">{t.columns.day}</th>
                  <th scope="col">{t.columns.workout}</th>
                  <th scope="col">{t.columns.distance}</th>
                  <th scope="col">{t.columns.time}</th>
                  <th scope="col">{t.columns.hr}</th>
                </tr>
              </thead>
              <tbody>
                {data.workouts.recent.map((wk) => (
                  <tr key={wk.id}>
                    <td className={styles.muted}>{formatDayShort(wk.day)}</td>
                    <td>
                      <button type="button" className={styles.rowButton} onClick={() => setOpen({ kind: 'workout', workout: wk })}>
                        {wk.title}
                      </button>
                    </td>
                    <td className={styles.num}>{wk.distanceKm ? t.km(wk.distanceKm) : '–'}</td>
                    <td className={styles.num}>{formatDuration(wk.durationSec)}</td>
                    <td className={styles.muted}>{wk.avgHr ? t.avgHr(wk.avgHr) : wk.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.card} aria-labelledby="metrics-title">
          <div className={styles.cardHead}>
            <h2 id="metrics-title" className={styles.cardTitle}>
              {t.yourMetrics}
            </h2>
            <button type="button" className={styles.textButton} onClick={() => setOpen({ kind: 'metric' })}>
              {t.addMetricPlus}
            </button>
          </div>
          {data.metrics.length === 0 && <p className={styles.quiet}>{t.metricsEmpty}</p>}
          <ul className={styles.metrics}>
            {data.metrics.map((m) => (
              <MetricRow key={m.metric.id} m={m} onTap={() => tap(m)} onEdit={() => setOpen({ kind: 'metric', metric: m.metric })} />
            ))}
          </ul>
          <p className={styles.note}>{t.metricsNote}</p>
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
  const t = useT().health;
  const max = Math.max(9 * 60, ...nights.map((x) => x.minutes ?? 0));
  return (
    <figure className={cx(styles.chart, compact && styles.chartCompact)}>
      <span className={styles.target} style={{ bottom: `${(SLEEP_TARGET_MIN / max) * 100}%` }} aria-hidden="true">
        {!compact && <span className={styles.targetLabel}>{t.target}</span>}
      </span>
      <ol className={styles.bars} aria-label={t.perNight}>
        {nights.map((night, i) => (
          <li key={night.day} className={styles.barSlot}>
            <span
              className={cx(styles.bar, night.minutes === null ? styles.none : night.minutes >= SLEEP_TARGET_MIN ? styles.rested : styles.short)}
              style={{ height: `${night.minutes === null ? 3 : (night.minutes / max) * 100}%` }}
              aria-hidden="true"
            />
            {!compact && <span className={cx(styles.barLabel, i === nights.length - 1 && styles.strong)}>{night.label}</span>}
            <span className="visually-hidden">
              {formatDayShort(night.day)}: {night.minutes === null ? t.notLoggedShort : formatSleep(night.minutes)}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function MoodPattern({ data, onHabit }: { data: HealthView; onHabit: () => void }) {
  const { health: t, seed } = useT();
  const p = data.pattern;
  if (!p) return <p className={styles.quiet}>{t.patternWait}</p>;
  const better = p.diff > 0;
  return (
    <>
      <p className={styles.lead}>
        {t.patternLead}{' '}
        <strong>
          {Math.abs(p.diff).toFixed(1)} {better ? t.higher : t.lower}
        </strong>
        .
      </p>
      <dl className={styles.moodBars}>
        <div>
          <dt>{t.rested}</dt>
          <dd>
            <span className={styles.moodTrack} aria-hidden="true">
              <span className={styles.rested} style={{ width: `${(p.rested / 5) * 100}%` }} />
            </span>
            <strong>{p.rested.toFixed(1)}</strong>
          </dd>
        </div>
        <div>
          <dt>{t.short}</dt>
          <dd>
            <span className={styles.moodTrack} aria-hidden="true">
              <span className={styles.short} style={{ width: `${(p.short / 5) * 100}%` }} />
            </span>
            <strong>{p.short.toFixed(1)}</strong>
          </dd>
        </div>
      </dl>
      <p className={styles.note}>{t.basedOn(p.restedDays + p.shortDays)}</p>
      {better &&
        (data.hasBedtimeHabit ? (
          <p className={styles.note}>{t.alreadyBedtime(seed.bedtime.title)}</p>
        ) : (
          <Button size="sm" className={styles.selfStart} onClick={onHabit}>
            {t.addBedtime(seed.bedtime.title)}
          </Button>
        ))}
    </>
  );
}

function MetricRow({ m, onTap, onEdit, compact = false }: { m: MetricToday; onTap: () => void; onEdit: () => void; compact?: boolean }) {
  const t = useT().health;
  const { metric, today, lastTime } = m;
  const value =
    metric.valueType === 'yesno'
      ? today
        ? t.doneToday
        : t.notYetToday
      : metric.valueType === 'scale'
        ? today === null
          ? t.notToday
          : `${today.toFixed(today % 1 ? 1 : 0)} / 5`
        : `${today === null ? 0 : Math.round(today * 10) / 10}${metric.target ? ` / ${metric.target}` : ''}${metric.unit && (!compact || !metric.target) ? ` ${metric.unit}` : ''}${!metric.target && lastTime && !compact ? t.last(lastTime) : ''}`;
  const unit = metric.unit ? ` ${metric.step === 1 ? singular(metric.unit) : metric.unit}` : '';
  const tapLabel = metric.valueType === 'number' ? t.addStep(metric.step, unit, metric.name) : t.logMetric(metric.name);
  return (
    <li className={styles.metric}>
      <button type="button" className={styles.metricName} onClick={onEdit} aria-label={t.editMetric(metric.name)}>
        {metric.name}
      </button>
      <span className={styles.metricValue}>{value}</span>
      <button type="button" className={styles.plus} aria-label={tapLabel} onClick={onTap}>
        <Icon name="plus" size={16} strokeWidth={2.2} />
      </button>
    </li>
  );
}

