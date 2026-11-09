import { useLiveQuery } from 'dexie-react-hooks';
import { isoWeek, year } from '@/domain/days';
import { inView, isDueToday, rhythmOf } from '@/domain/tasks';
import { tasksRepo } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { ProfileAvatar } from '@/components/shell/ProfileAvatar';
import { useShellActions } from '@/components/shell/shellActions';
import { useOnlineStatus } from '@/components/shell/useOnlineStatus';
import { AnimatedNumber, HatchBar, IconButton } from '@/components/ui';
import { Ring } from '@/components/ui/Ring';
import { formatDayLong, formatWeekdayDate, numberWord } from '@/lib/format';
import { useT, type Messages } from '@/i18n';
import { useIsMobile } from '@/lib/useMediaQuery';
import { withCompletedOn } from '@/lib/taskView';
import { useToday } from '@/lib/useToday';
import type { Day } from '@/domain/days';
import { Link } from 'react-router-dom';
import { AgendaCard } from './AgendaCard';
import { CheckInCard } from './CheckInCard';
import { FocusCard } from './FocusCard';
import { HabitsCard } from './HabitsCard';
import { OnThisDayCard } from './OnThisDayCard';
import { PlanCard } from './PlanCard';
import { VisionTile } from './VisionTile';
import { WeekCard } from './WeekCard';
import styles from './Today.module.css';

function greeting(t: Messages['today'], hour: number) {
  if (hour < 5) return t.greeting.night;
  if (hour < 12) return t.greeting.morning;
  if (hour < 18) return t.greeting.afternoon;
  return t.greeting.evening;
}

function headline(t: Messages['today'], open: number | undefined) {
  if (open === undefined) return '';
  if (open === 0) return t.headline.clear;
  if (open === 1) return t.headline.one;
  return t.headline.many(numberWord(open));
}

/** Today's tasks (done and open) and how many are still open, for the greeting and the rhythm. */
function useTodayCounts(today: Day) {
  return useLiveQuery(async () => {
    const all = withCompletedOn(await tasksRepo.list());
    const planned = all.filter((t) => inView(t, 'today', today));
    return { open: all.filter((t) => isDueToday(t, today)).length, done: planned.filter((t) => t.status === 'done').length, total: planned.length };
  }, [today]);
}

export function TodayPage() {
  return useIsMobile() ? <PhoneToday /> : <DesktopToday />;
}

function DesktopToday() {
  const t = useT().today;
  const { shell } = useT();
  const today = useToday();
  const counts = useTodayCounts(today);
  const { openCapture } = useShellActions();

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.barGreeting}>
          <p className={styles.barDate}>{formatWeekdayDate(today)}</p>
          <h1 className={styles.barHello}>
            {greeting(t, new Date().getHours())}
            <span className="visually-hidden"> {headline(t, counts?.open)}</span>
          </h1>
        </div>
        <Rhythm today={today} done={counts?.done ?? 0} total={counts?.total ?? 0} />
        <div className={styles.barActions}>
          <Link to="/tasks?view=anytime" className={styles.planIcon} aria-label={t.planMyDay} title={t.planMyDay}>
            <Icon name="calendar" size={19} />
          </Link>
          <button type="button" className={styles.capture} onClick={openCapture}>
            <Icon name="plus" size={17} strokeWidth={2} />
            {shell.quickCapture}
            <kbd className={styles.captureKey} aria-label={shell.commandN}>
              ⌘N
            </kbd>
          </button>
        </div>
      </header>

      <div className={styles.board}>
        <PlanCard today={today} />
        <HabitsCard today={today} />
        <div className={styles.stack}>
          <AgendaCard today={today} />
          <FocusCard today={today} />
        </div>
        <CheckInCard today={today} />
      </div>

      <div className={styles.lower}>
        <WeekCard today={today} />
        <VisionTile today={today} />
        <OnThisDayCard today={today} />
      </div>
    </div>
  );
}

/** Today, week, month and year as small rings; the full words show on hover or keyboard focus. */
function Rhythm({ today, done, total }: { today: Day; done: number; total: number }) {
  const { today: copy, format } = useT();
  const t = copy.rhythm;
  const r = rhythmOf(today);
  const week = isoWeek(today);
  const month = Number(today.slice(5, 7)) - 1;
  const yearPercent = (r.yearDay / r.yearDays) * 100;
  const items = [
    { key: 'today', value: `${done}/${total}`, title: t.today, detail: t.tasks(done, total), percent: total ? (done / total) * 100 : 0, color: 'var(--accent)' },
    { key: 'week', value: t.weekShort(week), title: t.week(week), detail: t.weekDay(r.weekDay), percent: (r.weekDay / 7) * 100, color: 'var(--inverse)' },
    { key: 'month', value: format.monthsShort[month]!, title: format.monthsLong[month]!, detail: `${r.monthDay}/${r.monthDays}`, percent: (r.monthDay / r.monthDays) * 100, color: 'var(--ink-2)' },
    { key: 'year', value: `${Math.round(yearPercent)}%`, title: String(year(today)), detail: t.daysLeft(r.yearDays - r.yearDay), percent: yearPercent, color: 'var(--ink-3)' },
  ];
  return (
    <ul className={styles.rhythm} aria-label={t.label}>
      {items.map((item) => (
        <li key={item.key} className={styles.rhythmItem} tabIndex={0} aria-label={`${item.title}, ${item.detail}`}>
          <Ring percent={item.percent} size={28} stroke={4} color={item.color} />
          <span className={styles.rhythmValue} aria-hidden="true">
            {item.value}
          </span>
          <span className={styles.rhythmTip} aria-hidden="true">
            {item.title}, {item.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Phones: header, greeting, the year in the accent, three stats, then the cards in one column. */
function PhoneToday() {
  const t = useT();
  const today = useToday();
  const counts = useTodayCounts(today);
  const { openSearch } = useShellActions();
  const online = useOnlineStatus();
  const r = rhythmOf(today);
  const yearPct = Math.round((r.yearDay / r.yearDays) * 100);
  const [weekday, ...rest] = formatWeekdayDate(today).split(', ');

  return (
    <div className={styles.phone}>
      <header className={styles.phoneTop}>
        <ProfileAvatar />
        <span className={styles.phoneDate}>
          <strong>{rest.length ? weekday : t.screens.today.title}</strong>
          <span>{rest.length ? `${rest.join(', ')}, ${year(today)}` : formatDayLong(today)}</span>
        </span>
        <IconButton icon="search" label={t.shell.search} onClick={openSearch} />
        <Link to="/settings/notifications" className={styles.phoneBell} aria-label={t.shell.notifications}>
          <Icon name="bell" size={20} />
        </Link>
      </header>
      {!online && (
        <p className={styles.offline} role="status">
          <Icon name="offline" size={16} />
          {t.today.mobile.offline}
        </p>
      )}
      <h1 className={styles.phoneDisplay}>
        {greeting(t.today, new Date().getHours())}
        <span className={styles.displayQuiet}> {headline(t.today, counts?.open)}</span>
      </h1>

      <section className={styles.yearCard} aria-label={t.today.yearSoFar}>
        <div className={styles.yearTop}>
          <span className={styles.yearChip}>{year(today)}</span>
          <span>{t.today.dayWeek(r.yearDay, isoWeek(today))}</span>
        </div>
        <p className={styles.yearFigure}>
          {yearPct}
          <span className={styles.unit}>%</span>
          <span className={styles.yearNote}>
            {t.today.hero.yearGone(year(today))} · {t.today.rhythm.daysLeft(r.yearDays - r.yearDay)}
          </span>
        </p>
        <HatchBar value={r.yearDay / r.yearDays} label={t.today.yearSoFar} valueText={`${yearPct}%`} className={styles.yearBar} />
      </section>

      <ul className={styles.stats}>
        <li>
          <span>{t.today.rhythm.today}</span>
          <strong>
            <AnimatedNumber value={counts?.done ?? 0} />
            <small>/{counts?.total ?? 0}</small>
          </strong>
        </li>
        <li>
          <span>{t.today.rhythm.week(isoWeek(today))}</span>
          <strong>
            {Math.round((r.weekDay / 7) * 100)}
            <small>%</small>
          </strong>
        </li>
        <li>
          <span>{t.format.monthsLong[Number(today.slice(5, 7)) - 1]}</span>
          <strong>
            {Math.round((r.monthDay / r.monthDays) * 100)}
            <small>%</small>
          </strong>
        </li>
      </ul>

      <AgendaCard today={today} compact />
      <CheckInCard today={today} />
      <PlanCard today={today} compact />
      <HabitsCard today={today} compact />
      <FocusCard today={today} />
      <OnThisDayCard today={today} />
    </div>
  );
}
