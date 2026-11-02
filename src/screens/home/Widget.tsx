import { Link } from 'react-router-dom';
import { dayOfMonth, dayToDate, type Day } from '@/domain/days';
import type { HomeData, HomeWidget } from '@/data';
import { Icon, type IconName } from '@/components/icons/Icon';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Ring } from '@/components/ui/Ring';
import { cx } from '@/components/ui/cx';
import { monthLabel } from '@/domain/finance';
import { formatMinutes } from '@/lib/format';
import { intlLocale, useT } from '@/i18n';
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
  const { home, format } = useT();
  const t = home.tile;
  const { size } = widget;
  switch (widget.kind) {
    case 'today': {
      const { done, total, next } = data.today;
      return (
        <Link to="/today" className={cx(styles.tile, styles.row)}>
          <Ring percent={total ? (done / total) * 100 : 0} size={size === 'L' ? 46 : 54} stroke={5} label={t.doneToday(done, total)}>
            <span className={styles.ringText}>
              <AnimatedNumber value={done} />/{total}
            </span>
          </Ring>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>{t.today}</span>
            <span className={styles.rowSub}>{next ? t.next(next) : total ? t.allDone : t.nothing}</span>
          </span>
          <Icon name="chevronRight" size={16} className={styles.chevron} />
        </Link>
      );
    }
    case 'goals': {
      const { top, onPace, behind } = data.goals;
      return (
        <Link to="/goals" className={styles.tile}>
          <Label icon="goals">{t.goals}</Label>
          {top ? (
            <div className={styles.goalBody}>
              <Ring percent={top.percent} size={size === 'S' ? 34 : 64} stroke={size === 'S' ? 4 : 7} color={top.color ? `var(--${top.color})` : undefined} label={`${top.title}, ${Math.round(top.percent)}%`}>
                {size !== 'S' && <span className={styles.ringDisplay}>{Math.round(top.percent)}%</span>}
              </Ring>
              <span className={styles.goalTitle}>{top.title}</span>
            </div>
          ) : (
            <span className={styles.rowSub}>{t.setGoal}</span>
          )}
          {size !== 'S' && (
            <span className={styles.meta}>
              <strong className={styles.good}>{t.onPace(onPace)}</strong>
              {t.behind(behind)}
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
              <span className={styles.calDay}>{format.weekdaysShort[dayToDate(today).getDay()]}</span>
              <span className={styles.calNumber}>{dayOfMonth(today)}</span>
            </span>
            <span className={styles.pill}>{t.left(data.calendar.left)}</span>
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
                <span>{t.noTimes}</span>
              )}
            </div>
          )}
        </Link>
      );
    case 'review':
      return (
        <Link to="/review" className={cx(styles.tile, styles.row, styles.inverse)}>
          <span className={styles.rowText}>
            <span className={styles.reviewTitle}>{t.review}</span>
            <span className={styles.reviewSub}>{data.review.done ? t.reviewDone(data.review.week) : t.reviewDue(data.review.isSunday, data.review.week)}</span>
          </span>
          <span className={styles.start}>{data.review.done ? t.open : t.start}</span>
        </Link>
      );
    case 'progress': {
      const weeks = size === 'S' ? data.progress.weeks.slice(-6) : data.progress.weeks.slice(-12);
      return (
        <Link to="/progress" className={styles.tile}>
          <Label icon="progress">{t.progress}</Label>
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
            <span className={styles.meta}>{t.habits12}</span>
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
              <Icon name="moon" size={13} /> {t.sleep}
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
            <span className={styles.smallLabel}>{t.spentIn(monthLabel(data.finance.month, true))}</span>
            <span className={styles.hiddenAmount} aria-label={t.amountHidden}>
              ••••
            </span>
          </span>
          {data.finance.budget > 0 ? (
            <>
              <span className={styles.financeTrack} aria-hidden="true">
                <span style={{ width: `${Math.min(100, (data.finance.spent / data.finance.budget) * 100)}%` }} />
              </span>
              <span className={styles.meta}>{t.ofBudget(Math.round((data.finance.spent / data.finance.budget) * 100))}</span>
            </>
          ) : (
            <span className={styles.meta}>{size === 'S' ? t.setBudgets : t.setBudgetsLong}</span>
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
            <span className={styles.smallLabel}>{t.vision}</span>
            <span className={styles.word}>{data.vision.word ?? t.yourWord}</span>
          </span>
        </Link>
      );
    case 'steps': {
      const max = Math.max(1, ...data.steps.week.map((n) => n ?? 0));
      return (
        <Link to="/health" className={cx(styles.tile, styles.row)}>
          <span className={styles.rowText}>
            <span className={styles.smallLabel}>
              <Icon name="health" size={13} /> {t.steps}
            </span>
            <span className={styles.value}>{data.steps.today === null ? '–' : Math.round(data.steps.today).toLocaleString(intlLocale())}</span>
            {size !== 'S' && data.steps.average !== null && <span className={styles.meta}>{t.avg(Math.round(data.steps.average).toLocaleString(intlLocale()))}</span>}
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
          <Label icon="assistant">{home.widgets[widget.kind].title}</Label>
          <span className={styles.meta}>{t.assistant}</span>
        </Link>
      );
    case 'pinned':
      return <Pinned widget={widget} data={data} />;
  }
}

function Pinned({ widget, data }: { widget: HomeWidget; data: HomeData }) {
  const t = useT().home.tile;
  const pin = data.pins.get(widget.id);
  if (!pin || pin.kind === 'missing') {
    return (
      <div className={styles.tile}>
        <Label icon="pin">{t.pinned}</Label>
        <span className={styles.meta}>{t.deleted}</span>
      </div>
    );
  }
  const tint = pin.color ? { background: `var(--${pin.color}-soft)`, color: `var(--${pin.color}-ink)` } : undefined;
  const bar = pin.color ? `var(--${pin.color})` : 'var(--primary)';
  const to = pin.kind === 'node' ? `/library/${pin.id}` : pin.kind === 'goal' ? `/goals/${pin.id}` : '/today';
  const small = widget.size === 'S';
  return (
    <Link to={to} className={cx(styles.tile, pin.color ? styles.tinted : undefined, small && styles.pinSmall)} style={tint}>
      {!small && <Label icon="pin">{t.pinned}</Label>}
      <span className={small ? styles.pinTitleSmall : styles.pinTitle}>{pin.title}</span>
      {pin.kind === 'node' && pin.total > 0 && !small && (
        <span className={styles.pinProgress}>
          <span className={styles.meta}>
            {pin.label ? `${pin.label}, ` : ''}
            {t.count(pin.done, pin.total)}
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
      {pin.kind === 'habit' && !small && <span className={styles.meta}>{pin.doneToday ? t.habitDone : t.notYet}{pin.streak > 1 ? t.streak(pin.streak) : ''}</span>}
    </Link>
  );
}
