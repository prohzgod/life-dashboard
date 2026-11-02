import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { countViews } from '@/domain/tasks';
import { tasksRepo } from '@/data';
import { screens, type Screen } from '@/app/screens';
import { useT } from '@/i18n';
import { withCompletedOn } from '@/lib/taskView';
import { useToday } from '@/lib/useToday';
import { useResolvedTheme } from '@/theme/useResolvedTheme';
import { withThemeTransition } from '@/theme/transition';
import { useThemePreference } from '@/theme/useThemePreference';
import { Icon } from '../icons/Icon';
import { Menu, SlidingPill } from '../ui';
import { cx } from '../ui/cx';
import { ProfileAvatar } from './ProfileAvatar';
import styles from './TopNav.module.css';
import { SyncNotice } from '@/screens/settings/SyncSettings';
import { useOnlineStatus } from './useOnlineStatus';

/** The pill row of screens; the rest sit under More. */
const MAIN: Screen[] = [screens.today, screens.inbox, screens.tasks, screens.calendar, screens.goals, screens.progress, screens.library];
const MORE: Screen[] = [screens.review, screens.vision, screens.finance, screens.health, screens.assistant];

const isOn = (screen: Screen, pathname: string) =>
  [screen.path, screen.activeFor].some((p) => p && p !== '/' && (pathname === p || pathname.startsWith(`${p}/`))) ||
  (screen.path === '/' && (pathname === '/' || pathname === '/today'));

/** Tablets and up: logo pill, nav pill, and round actions, floating on the background. */
export function TopNav({ onSearch }: { onSearch: () => void }) {
  const t = useT();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const today = useToday();
  const counts = useLiveQuery(async () => countViews(withCompletedOn(await tasksRepo.list()), today), [today]);
  const [, setMode] = useThemePreference();
  const theme = useResolvedTheme();
  const moreOn = MORE.some((s) => isOn(s, pathname));
  const online = useOnlineStatus();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo} aria-label={t.shell.homeLink}>
        <span className={styles.mark} aria-hidden="true">
          <Icon name="logo" size={22} strokeWidth={2} />
        </span>
        <span className={styles.wordmark}>
          {t.shell.brandStrong} {t.shell.brandRest}
        </span>
      </Link>

      <nav aria-label={t.shell.mainNav} className={styles.navWrap}>
        <ul className={styles.nav}>
          <SlidingPill as="li" selector={`.${styles.active}`} className={styles.pill} />
          {MAIN.map((screen) => {
            const on = isOn(screen, pathname);
            const count = screen.key === 'inbox' ? counts?.inbox : undefined;
            return (
              <li key={screen.key}>
                <Link to={screen.path} className={cx(styles.item, on && styles.active)} aria-current={on ? 'page' : undefined}>
                  {screen.key === 'library' ? t.shell.tabLibrary : screen.navLabel}
                  {!!count && (
                    <span className={styles.badge} aria-label={t.shell.openCount(count)}>
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <Menu
              label={t.shell.moreScreens}
              triggerClassName={cx(styles.item, styles.more, moreOn && styles.active)}
              trigger={
                <>
                  {t.shell.more}
                  <Icon name="chevronDown" size={16} />
                </>
              }
              items={MORE.map((screen) => ({ label: screen.navLabel, onSelect: () => navigate(screen.path) }))}
            />
          </li>
        </ul>
      </nav>

      <div className={styles.actions}>
        <SyncNotice />
        {!online && (
          <span className={styles.offline} role="status">
            <Icon name="offline" size={16} />
            <span className={styles.offlineText}>{t.shell.offlineWorks}</span>
          </span>
        )}
        <button type="button" className={styles.round} aria-label={t.shell.search} onClick={onSearch}>
          <Icon name="search" size={20} />
        </button>
        <div className={styles.toggle} role="group" aria-label={t.settings.appearance.mode}>
          <SlidingPill selector="[aria-pressed='true']" className={styles.togglePill} />
          <button type="button" aria-label={t.shell.lightTheme} aria-pressed={theme === 'light'} className={styles.toggleOption} onClick={() => withThemeTransition(() => setMode('light'))}>
            <Icon name="sun" size={18} />
          </button>
          <button type="button" aria-label={t.shell.darkTheme} aria-pressed={theme === 'dark'} className={styles.toggleOption} onClick={() => withThemeTransition(() => setMode('dark'))}>
            <Icon name="moon" size={18} />
          </button>
        </div>
        <Link to="/settings/notifications" className={styles.round} aria-label={t.shell.notifications}>
          <Icon name="bell" size={20} />
        </Link>
        <ProfileAvatar size="md" />
      </div>
    </header>
  );
}
