import { Link } from 'react-router-dom';
import type { Tab } from '@/app/mobileChrome';
import { useT, type Messages } from '@/i18n';
import { Icon, type IconName } from '../icons/Icon';
import { cx } from '../ui/cx';
import styles from './TabBar.module.css';

const TABS: Array<{ tab: Tab; label: (t: Messages['shell']) => string; to: string; icon: IconName }> = [
  { tab: 'home', label: (t) => t.home, to: '/', icon: 'home' },
  { tab: 'today', label: (t) => t.tabToday, to: '/today', icon: 'today' },
  { tab: 'tasks', label: (t) => t.tabTasks, to: '/inbox', icon: 'tasks' },
  { tab: 'library', label: (t) => t.tabLibrary, to: '/library', icon: 'library' },
];

/** Phones: Home, Today, +, Tasks, Library, with capture in the middle. */
export function TabBar({ active, onCapture }: { active: Tab; onCapture: () => void }) {
  const { shell } = useT();
  const link = (t: (typeof TABS)[number]) => (
    <Link key={t.tab} to={t.to} className={cx(styles.tab, active === t.tab && styles.active)} aria-current={active === t.tab ? 'page' : undefined}>
      <Icon name={t.icon} size={22} strokeWidth={active === t.tab ? 2 : 1.7} />
      {t.label(shell)}
    </Link>
  );
  return (
    <nav aria-label={shell.tabs} className={styles.bar}>
      {TABS.slice(0, 2).map(link)}
      <button type="button" className={styles.capture} aria-label={shell.quickCapture} onClick={onCapture}>
        <Icon name="plus" size={24} strokeWidth={2.2} />
      </button>
      {TABS.slice(2).map(link)}
    </nav>
  );
}
