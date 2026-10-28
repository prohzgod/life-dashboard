import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { Card } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useAgenda } from './useAgenda';
import styles from './Today.module.css';

export function AgendaCard({ today }: { today: Day }) {
  const agenda = useAgenda(today);
  const next = agenda?.entries.find((e) => !e.done && !e.allDay && e.soon);
  const shown = agenda?.entries.slice(0, 4) ?? [];
  const more = (agenda?.entries.length ?? 0) - shown.length;

  return (
    <Card
      title="Agenda"
      meta={agenda?.calendars.join(', ')}
      className={styles.card}
      action={
        <Link to="/calendar" className={styles.cardLink}>
          {more > 0 ? `${more} more in Calendar` : 'Open calendar'}
        </Link>
      }
    >
      {agenda && shown.length === 0 && <p className={styles.agendaEmpty}>Nothing on your calendar today. Put a task on the calendar to give it a time.</p>}
      {shown.length > 0 && (
        <ol className={styles.agenda}>
          {shown.map((e) => (
            <li
              key={e.key}
              className={cx(styles.agendaItem, e.block && styles.agendaBlock, e.done && styles.agendaDone)}
              style={!e.block && !e.done ? ({ '--tone-soft': `var(--${e.tone}-soft)`, '--tone-ink': `var(--${e.tone}-ink)` } as CSSProperties) : undefined}
            >
              <span className={styles.agendaTime}>
                {e.time}
                {e.done && !e.allDay ? ', done' : ''}
              </span>
              <span className={styles.agendaTitle}>{e.title}</span>
              <span className={styles.agendaSource}>
                {e.source}
                {e === next && e.soon && (
                  <>
                    {', '}
                    <strong className={styles.agendaSoon}>{e.soon}</strong>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
