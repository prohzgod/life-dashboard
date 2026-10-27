import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import styles from './Today.module.css';

/** Placeholder until Calendar: events and time blocks will fill this strip. */
export function AgendaCard() {
  return (
    <Card
      title="Agenda"
      className={styles.card}
      action={
        <Link to="/calendar" className={styles.cardLink}>
          Open calendar
        </Link>
      }
    >
      <p className={styles.agendaEmpty}>Your calendar events and time blocks will show here once Calendar is connected.</p>
    </Card>
  );
}
