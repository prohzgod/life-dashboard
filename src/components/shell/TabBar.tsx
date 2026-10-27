import { Link } from 'react-router-dom';
import type { Tab } from '@/app/mobileChrome';
import { Icon, type IconName } from '../icons/Icon';
import { cx } from '../ui/cx';
import styles from './TabBar.module.css';

const TABS: Array<{ tab: Tab; label: string; to: string; icon: IconName }> = [
  { tab: 'home', label: 'Home', to: '/', icon: 'home' },
  { tab: 'today', label: 'Today', to: '/today', icon: 'today' },
  { tab: 'tasks', label: 'Tasks', to: '/inbox', icon: 'tasks' },
  { tab: 'library', label: 'Library', to: '/library', icon: 'library' },
];

/** Phones: Home · Today · + · Tasks · Library, with capture in the middle. */
export function TabBar({ active, onCapture }: { active: Tab; onCapture: () => void }) {
  const link = (t: (typeof TABS)[number]) => (
    <Link key={t.tab} to={t.to} className={cx(styles.tab, active === t.tab && styles.active)} aria-current={active === t.tab ? 'page' : undefined}>
      <Icon name={t.icon} size={22} strokeWidth={active === t.tab ? 2 : 1.7} />
      {t.label}
    </Link>
  );
  return (
    <nav aria-label="Tabs" className={styles.bar}>
      {TABS.slice(0, 2).map(link)}
      <button type="button" className={styles.capture} aria-label="Quick capture" onClick={onCapture}>
        <Icon name="plus" size={24} strokeWidth={2.2} />
      </button>
      {TABS.slice(2).map(link)}
    </nav>
  );
}
