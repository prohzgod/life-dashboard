import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { SIZE_SPAN } from '@/domain/home';
import { loadHomeData } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { ProfileAvatar } from '@/components/shell/ProfileAvatar';
import { useOnlineStatus } from '@/components/shell/useOnlineStatus';
import { formatWeekdayDate } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { Widget } from './Widget';
import { useT, type Messages } from '@/i18n';
import styles from './Home.module.css';

function greeting(t: Messages['home'], hour: number) {
  if (hour < 5 || hour >= 18) return t.greeting.evening;
  return hour < 12 ? t.greeting.morning : t.greeting.afternoon;
}

/** Phones open here: a bento grid of live widgets you arrange in Edit Home. */
export function HomePage() {
  const t = useT().home;
  const today = useToday();
  const online = useOnlineStatus();
  const data = useLiveQuery(() => loadHomeData(today), [today]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{formatWeekdayDate(today)}</span>
          <h1 className={styles.title}>{greeting(t, new Date().getHours())}</h1>
        </div>
        <div className={styles.headerSide}>
          <span className={online ? styles.saved : `${styles.saved} ${styles.offline}`} title={online ? t.savedTitle : t.offlineTitle}>
            <span className={styles.savedDot} aria-hidden="true" />
            {online ? t.saved : t.offline}
          </span>
          <ProfileAvatar />
        </div>
      </header>

      {data && (
        <ul className={styles.bento} aria-label={t.widgetsLabel}>
          {data.widgets
            .filter((w) => !w.hidden)
            .map((w) => (
              <li key={w.id} style={{ gridColumn: `span ${SIZE_SPAN[w.size].cols}`, gridRow: `span ${SIZE_SPAN[w.size].rows}` }}>
                <Widget widget={w} data={data} today={today} />
              </li>
            ))}
          <li style={{ gridColumn: 'span 2' }}>
            <Link to="/home/edit" className={styles.editTile}>
              <Icon name="widgets" size={18} />
              {t.editHome}
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
