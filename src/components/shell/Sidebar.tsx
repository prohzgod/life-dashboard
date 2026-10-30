import { useLiveQuery } from 'dexie-react-hooks';
import { NavLink, useLocation } from 'react-router-dom';
import { countViews } from '@/domain/tasks';
import { tasksRepo } from '@/data';
import { useToday } from '@/lib/useToday';
import { withCompletedOn } from '@/lib/taskView';
import { navGroups } from '@/app/screens';
import { useT } from '@/i18n';
import { Icon } from '../icons/Icon';
import styles from './Sidebar.module.css';
import { useOnlineStatus } from './useOnlineStatus';

type SidebarProps = {
  onSearch: () => void;
  onCapture: () => void;
};

export function Sidebar({ onSearch, onCapture }: SidebarProps) {
  const t = useT();
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  const today = useToday();
  const counts = useLiveQuery(async () => countViews(withCompletedOn(await tasksRepo.list()), today), [today]);

  return (
    // The rail paints the midnight column for the full page height; the nav inside stays in view.
    <div className={styles.rail}>
      <nav aria-label={t.shell.mainNav} className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.wordmark}>
            <strong>{t.shell.brandStrong}</strong> <span>{t.shell.brandRest}</span>
          </span>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.search} onClick={onSearch}>
            <Icon name="search" size={16} strokeWidth={1.9} />
            <span className={styles.grow}>{t.shell.searchOrJump}</span>
            <kbd className={styles.kbd} aria-label="Command K">⌘K</kbd>
          </button>
          <button type="button" className={styles.capture} onClick={onCapture}>
            <Icon name="plus" size={16} strokeWidth={2.2} />
            <span>{t.shell.quickCapture}</span>
            <kbd className={styles.kbdOnAccent} aria-label="Command N">⌘N</kbd>
          </button>
        </div>

        <div className={styles.groups}>
          {navGroups().map((group) => (
            <div key={group.label} className={styles.group}>
              <h2 className={styles.groupLabel}>
                <span>{group.label}</span>
                {group.hint && <span className={styles.groupHint}>{group.hint}</span>}
              </h2>
              <ul className={styles.list}>
                {group.screens.map((screen) => (
                  <li key={screen.key}>
                    <NavLink
                      to={screen.path}
                      end={screen.path === '/'}
                      className={({ isActive }) => (isActive || (screen.activeFor && (pathname === screen.activeFor || pathname.startsWith(`${screen.activeFor}/`))) ? `${styles.item} ${styles.active}` : styles.item)}
                    >
                      <Icon name={screen.icon} className={styles.itemIcon} />
                      <span className={styles.grow}>{screen.navLabel}</span>
                      {screen.badge && <span className={styles.badge}>{screen.badge}</span>}
                    {screen.countKey && !!counts?.[screen.countKey] && (
                      <span className={styles.badge} aria-label={t.shell.openCount(counts[screen.countKey])}>
                        {counts[screen.countKey]}
                      </span>
                    )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.status} role="status">
            <div className={styles.statusTitle}>
              <span className={online ? styles.statusDot : `${styles.statusDot} ${styles.statusDotOffline}`} aria-hidden="true" />
              <span>{t.shell.savedOnDevice}</span>
            </div>
            <div className={styles.statusLine}>
              {online ? t.shell.deviceOnly : t.shell.offlineWorks}
            </div>
          </div>

          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? `${styles.settings} ${styles.settingsActive}` : styles.settings)}
          >
            <Icon name="settings" />
            <span>{t.shell.settings}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
