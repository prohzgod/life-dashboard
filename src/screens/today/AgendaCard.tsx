import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { Icon } from '@/components/icons/Icon';
import { ArrowLink, Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import { useAgenda, type AgendaEntry } from './useAgenda';
import styles from './Today.module.css';

/**
 * Today's schedule as event blocks: past ones recessed and struck through, the one happening now
 * in the strong fill with how long is left, the next one raised with an accent dot. On phones, only
 * now and next.
 */
export function AgendaCard({ today, compact = false, className }: { today: Day; compact?: boolean; className?: string }) {
  const t = useT().today.agenda;
  const agenda = useAgenda(today);
  // Holds the card's place while it loads, so the card below doesn't jump.
  if (!agenda) return compact ? null : <Card title={t.title} className={cx(styles.agendaLoading, className)} />;
  const upcoming = agenda.entries.filter((e) => !e.done);
  const next = upcoming.find((e) => !e.allDay && !e.now);
  const shown = compact ? upcoming.filter((e) => e.now || e === next) : agenda.entries.slice(0, 5);
  const more = (compact ? upcoming.length : agenda.entries.length) - shown.length;

  if (compact) {
    if (shown.length === 0) return null;
    return (
      <section className={styles.nowNext} aria-label={t.title}>
        <ol className={styles.events}>
          {shown.map((e) => (
            <EventBlock key={e.key} entry={e} next={e === next} compact />
          ))}
        </ol>
        <Link to="/calendar" className={styles.nowNextLink}>
          {more > 0 ? t.moreInCalendar(more) : t.open}
          <Icon name="chevronRight" size={16} />
        </Link>
      </section>
    );
  }

  return (
    <Card
      title={t.title}
      className={className}
      meta={agenda.calendars.length ? <span className={styles.chip}>{agenda.calendars.join(', ')}</span> : undefined}
      action={<ArrowLink to="/calendar" label={more > 0 ? t.moreInCalendar(more) : t.open} />}
    >
      {shown.length === 0 ? (
        <p className={styles.emptyRow}>{t.empty}</p>
      ) : (
        <ol className={styles.events}>
          {shown.map((e) => (
            <EventBlock key={e.key} entry={e} next={e === next} />
          ))}
        </ol>
      )}
    </Card>
  );
}

function EventBlock({ entry: e, next, compact = false }: { entry: AgendaEntry; next: boolean; compact?: boolean }) {
  const t = useT().today.agenda;
  return (
    <li className={cx(styles.event, compact && styles.eventCompact)}>
      {!compact && <span className={cx(styles.eventTime, e.now && styles.eventTimeNow)}>{e.allDay ? t.allDay : e.time.split('–')[0]}</span>}
      <div className={cx(styles.block, e.done && styles.blockPast, e.now && styles.blockNow, next && styles.blockNext)}>
        {e.now ? (
          <>
            <span className={styles.nowLine}>
              <span className={styles.nowDot} aria-hidden="true" />
              {compact ? `${e.time.split('–')[0]} · ` : ''}
              {t.nowLeft(e.now.minutesLeft)}
            </span>
            <span className={styles.blockTitle}>{e.title}</span>
            <span className={styles.nowTrack} aria-hidden="true">
              <span className={styles.nowFill} style={{ width: `${Math.round(e.now.progress * 100)}%` }} />
            </span>
          </>
        ) : (
          <>
            <span className={styles.blockText}>
              <span className={styles.blockTitle}>
                {compact && <span className={styles.blockTimeInline}>{e.time.split('–')[0]}</span>}
                {e.title}
              </span>
              {!compact && (
                <span className={styles.blockMeta}>
                  {e.time}
                  {e.source ? ` · ${e.source}` : ''}
                  {e.done && !e.allDay ? t.done : ''}
                </span>
              )}
            </span>
            {next && <span className={styles.nextDot} aria-hidden="true" />}
          </>
        )}
      </div>
    </li>
  );
}
