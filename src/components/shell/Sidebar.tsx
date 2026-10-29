import { useLiveQuery } from 'dexie-react-hooks';
import { NavLink, useLocation } from 'react-router-dom';
import { countViews } from '@/domain/tasks';
import { tasksRepo } from '@/data';
import { useToday } from '@/lib/useToday';
import { withCompletedOn } from '@/lib/taskView';
import { navGroups } from '@/app/screens';
import { Icon } from '../icons/Icon';
import styles from './Sidebar.module.css';
import { useOnlineStatus } from './useOnlineStatus';

type SidebarProps = {
  onSearch: () => void;
  onCapture: () => void;
};

export function Sidebar({ onSearch, onCapture }: SidebarProps) {
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  const today = useToday();
  const counts = useLiveQuery(async () => countViews(withCompletedOn(await tasksRepo.list()), today), [today]);

  return (
    // The rail paints the midnight column for the full page height; the nav inside stays in view.
    <div className={styles.rail}>
      <nav aria-label="Main navigation" className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.wordmark}>
            <strong>Life</strong> <span>Dashboard</span>
          </span>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.search} onClick={onSearch}>
            <Icon name="search" size={16} strokeWidth={1.9} />
            <span className={styles.grow}>Search or jump to…</span>
            <kbd className={styles.kbd} aria-label="Command K">⌘K</kbd>
          </button>
          <button type="button" className={styles.capture} onClick={onCapture}>
            <Icon name="plus" size={16} strokeWidth={2.2} />
            <span>Quick capture</span>
            <kbd className={styles.kbdOnAccent} aria-label="Command N">⌘N</kbd>
          </button>
        </div>

        <div className={styles.groups}>
          {navGroups.map((group) => (
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
                      <span className={styles.badge} aria-label={`${counts[screen.countKey]} open`}>
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
              <span>Saved on this device</span>
            </div>
            <div className={styles.statusLine}>
              {online ? 'This device only, sync is off' : 'Offline, everything still works'}
            </div>
          </div>

          <div className={styles.spaceRow}>
            <button type="button" className={styles.space} aria-disabled="true" title="Shared spaces arrive in a later version">
              <span className={styles.avatar} aria-hidden="true">P</span>
              <span className={styles.spaceText}>
                <span className={styles.spaceName}>Personal space</span>
                <span className={styles.spaceHint}>Family space soon</span>
              </span>
              <Icon name="chevronsUpDown" size={16} strokeWidth={2} className={styles.spaceChevron} />
            </button>
            <NavLink
              to="/settings"
              aria-label="Settings"
              className={({ isActive }) => (isActive ? `${styles.settings} ${styles.settingsActive}` : styles.settings)}
            >
              <Icon name="settings" />
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
}
