import { Link } from 'react-router-dom';
import { dayOfMonth, type Day } from '@/domain/days';
import { WIDGET_INFO } from '@/domain/home';
import type { HomeData, HomeWidget } from '@/data';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Ring } from '@/components/ui/Ring';
import { cx } from '@/components/ui/cx';
import { monthLabel } from '@/domain/finance';
import { formatMinutes, weekdayName } from '@/lib/format';
import styles from './Home.module.css';

const HEAT = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];

type Props = { widget: HomeWidget; data: HomeData; today: Day };

function Label({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className={styles.label}>
      <Icon name={icon} size={13} />
      {children}
    </span>
  );
}

/** One Home tile, drawn for its kind and size. */
export function Widget({ widget, data, today }: Props) {
  const { size } = widget;
  switch (widget.kind) {
    case 'today': {
      const { done, total, next } = data.today;
      return (
        <Link to="/today" className={cx(styles.tile, styles.row)}>
          <Ring percent={total ? (done / total) * 100 : 0} size={size === 'L' ? 46 : 54} stroke={5} label={`${done} of ${total} done today`}>
            <span className={styles.ringText}>
              {done}/{total}
            </span>
          </Ring>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Today</span>
            <span className={styles.rowSub}>{next ? `Next, ${next}` : total ? 'All done. Nicely done.' : 'Nothing planned yet'}</span>
          </span>
          <Icon name="chevronRight" size={16} className={styles.chevron} />
        </Link>
      );
    }
    case 'goals': {
      const { top, onPace, behind } = data.goals;
      return (
        <Link to="/goals" className={styles.tile}>
          <Label icon="goals">Goals</Label>
          {top ? (
            <div className={styles.goalBody}>
              <Ring percent={top.percent} size={size === 'S' ? 34 : 64} stroke={size === 'S' ? 4 : 7} color={top.color ? `var(--${top.color})` : undefined} label={`${top.title}, ${Math.round(top.percent)}%`}>
                {size !== 'S' && <span className={styles.ringDisplay}>{Math.round(top.percent)}%</span>}
              </Ring>
              <span className={styles.goalTitle}>{top.title}</span>
            </div>
          ) : (
            <span className={styles.rowSub}>Set a goal for this year</span>
          )}
          {size !== 'S' && (
            <span className={styles.meta}>
              <strong className={styles.good}>{onPace} on pace</strong>, {behind} behind
            </span>
          )}
        </Link>
      );
    }
    case 'calendar':
      return (
        <Link to="/calendar" className={cx(styles.tile, styles.tinted)} style={{ background: 'var(--career-soft)', color: 'var(--career-ink)' }}>
          <div className={styles.calTop}>
            <span className={styles.calDate}>
              <span className={styles.calDay}>{weekdayName(today).slice(0, 3)}</span>
              <span className={styles.calNumber}>{dayOfMonth(today)}</span>
            </span>
            <span className={styles.pill}>{data.calendar.left} left</span>
          </div>
          {size !== 'S' && (
            <div className={styles.calList}>
              {data.calendar.timed.length ? (
                data.calendar.timed.map((t) => (
                  <span key={t.time + t.title}>
                    <strong>{t.time}</strong>
                    {t.title}
                  </span>
                ))
              ) : (
                <span>No times set today</span>
              )}
            </div>
          )}
        </Link>
      );
    case 'review':
      return (
        <Link to="/review" className={cx(styles.tile, styles.row, styles.inverse)}>
          <span className={styles.rowText}>
            <span className={styles.reviewTitle}>Weekly review</span>
            <span className={styles.reviewSub}>{data.review.done ? `Done for week ${data.review.week}` : `${data.review.isSunday ? 'Today' : 'Sunday'}, about 15 min, week ${data.review.week}`}</span>
          </span>
          <span className={styles.start}>{data.review.done ? 'Open' : 'Start'}</span>
        </Link>
      );
    case 'progress': {
      const weeks = size === 'S' ? data.progress.weeks.slice(-6) : data.progress.weeks.slice(-12);
      return (
        <Link to="/progress" className={styles.tile}>
          <Label icon="progress">Progress</Label>
          {size !== 'S' && (
            <span className={styles.heat} aria-hidden="true">
              {weeks.map((week, w) => (
                <span key={w} className={styles.heatCol}>
                  {week.map((level, d) => (
                    <span key={d} className={styles.heatCell} style={level === null ? undefined : { background: HEAT[level], borderColor: 'transparent' }} />
                  ))}
                </span>
              ))}
            </span>
          )}
          <span className={styles.bigLine}>
            <span className={styles.big}>{data.progress.consistency === null ? '–' : `${Math.round(data.progress.consistency * 100)}%`}</span>
            <span className={styles.meta}>habits, 12 weeks</span>
          </span>
        </Link>
      );
    }
    case 'sleep': {
      const max = Math.max(480, ...data.sleep.week.map((n) => n ?? 0));
      return (
        <Link to="/health" className={cx(styles.tile, styles.row)}>
          <span className={styles.rowText}>
            <span className={styles.smallLabel}>
              <Icon name="moon" size={13} /> Sleep
            </span>
            <span className={styles.value}>{data.sleep.last === null ? '–' : formatMinutes(data.sleep.last).replace(/h (\d)m$/, 'h 0$1m')}</span>
          </span>
          <span className={styles.bars} aria-hidden="true">
            {data.sleep.week.map((n, i) => (
              <span key={i} className={styles.bar} style={{ height: `${Math.max(8, ((n ?? 0) / max) * 100)}%`, background: n === null ? 'var(--track)' : n >= 420 ? 'var(--career)' : 'var(--viz-soft)' }} />
            ))}
          </span>
        </Link>
      );
    }
    case 'finance':
      return (
        <Link to="/finance" className={cx(styles.tile, styles.tinted)} style={{ background: 'var(--finance-soft)', color: 'var(--finance-ink)' }}>
          <span className={styles.financeTop}>
            <span className={styles.smallLabel}>Spent in {monthLabel(data.finance.month, true)}</span>
            <span className={styles.hiddenAmount} aria-label="Amount hidden">
              ••••
            </span>
          </span>
          {data.finance.budget > 0 ? (
            <>
              <span className={styles.financeTrack} aria-hidden="true">
                <span style={{ width: `${Math.min(100, (data.finance.spent / data.finance.budget) * 100)}%` }} />
              </span>
              <span className={styles.meta}>{Math.round((data.finance.spent / data.finance.budget) * 100)}% of budget</span>
            </>
          ) : (
            <span className={styles.meta}>{size === 'S' ? 'Set budgets' : 'Set budgets to see how the month is going.'}</span>
          )}
        </Link>
      );
    case 'vision':
      return (
        <Link to="/vision" className={cx(styles.tile, styles.row)}>
          <span className={styles.swatches} aria-hidden="true">
            {(data.vision.swatches.length ? data.vision.swatches : ['var(--inverse)', 'var(--family-soft)', 'var(--health-soft)']).map((bg, i) => (
              <span key={i} style={{ background: bg }} />
            ))}
          </span>
          <span className={styles.rowText}>
            <span className={styles.smallLabel}>Vision</span>
            <span className={styles.word}>{data.vision.word ?? 'Your word'}</span>
          </span>
        </Link>
      );
    case 'steps': {
      const max = Math.max(1, ...data.steps.week.map((n) => n ?? 0));
      return (
        <Link to="/health" className={cx(styles.tile, styles.row)}>
          <span className={styles.rowText}>
            <span className={styles.smallLabel}>
              <Icon name="health" size={13} /> Steps
            </span>
            <span className={styles.value}>{data.steps.today === null ? '–' : Math.round(data.steps.today).toLocaleString()}</span>
            {size !== 'S' && data.steps.average !== null && <span className={styles.meta}>avg {Math.round(data.steps.average).toLocaleString()}</span>}
          </span>
          <span className={styles.bars} aria-hidden="true">
            {data.steps.week.map((n, i) => (
              <span key={i} className={styles.bar} style={{ height: `${Math.max(8, ((n ?? 0) / max) * 100)}%`, background: n === null ? 'var(--track)' : 'var(--health)' }} />
            ))}
          </span>
        </Link>
      );
    }
    case 'assistant':
      return (
        <Link to="/assistant" className={styles.tile}>
          <Label icon="assistant">{WIDGET_INFO[widget.kind].title}</Label>
          <span className={styles.meta}>Comes with the Assistant module.</span>
        </Link>
      );
    case 'pinned':
      return <Pinned widget={widget} data={data} />;
  }
}

function Pinned({ widget, data }: { widget: HomeWidget; data: HomeData }) {
  const pin = data.pins.get(widget.id);
  if (!pin || pin.kind === 'missing') {
    return (
      <div className={styles.tile}>
        <Label icon="pin">Pinned</Label>
        <span className={styles.meta}>This was deleted. Remove it in Edit home.</span>
      </div>
    );
  }
  const tint = pin.color ? { background: `var(--${pin.color}-soft)`, color: `var(--${pin.color}-ink)` } : undefined;
  const bar = pin.color ? `var(--${pin.color})` : 'var(--primary)';
  const to = pin.kind === 'node' ? `/library/${pin.id}` : pin.kind === 'goal' ? `/goals/${pin.id}` : '/today';
  const small = widget.size === 'S';
  return (
    <Link to={to} className={cx(styles.tile, pin.color ? styles.tinted : undefined, small && styles.pinSmall)} style={tint}>
      {!small && <Label icon="pin">Pinned</Label>}
      <span className={small ? styles.pinTitleSmall : styles.pinTitle}>{pin.title}</span>
      {pin.kind === 'node' && pin.total > 0 && !small && (
        <span className={styles.pinProgress}>
          <span className={styles.meta}>
            {pin.label ? `${pin.label}, ` : ''}
            {pin.done} of {pin.total}
          </span>
          <span className={styles.track}>
            <span style={{ width: `${(pin.done / pin.total) * 100}%`, background: bar }} />
          </span>
        </span>
      )}
      {pin.kind === 'goal' && !small && (
        <span className={styles.pinProgress}>
          <span className={styles.meta}>{pin.percent === null ? pin.sentence : `${Math.round(pin.percent)}%, ${pin.sentence.toLowerCase()}`}</span>
          <span className={styles.track}>
            <span style={{ width: `${pin.percent ?? 0}%`, background: bar }} />
          </span>
        </span>
      )}
      {pin.kind === 'habit' && !small && <span className={styles.meta}>{pin.doneToday ? 'Done today' : 'Not yet today'}{pin.streak > 1 ? `, ${pin.streak}-day streak` : ''}</span>}
    </Link>
  );
}
