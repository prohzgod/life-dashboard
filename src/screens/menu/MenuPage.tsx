import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Navigate } from 'react-router-dom';
import { getProfile, togglePinnedScreen } from '@/data';
import { screens, type Screen } from '@/app/screens';
import { Icon, type IconName } from '@/components/icons/Icon';
import { PageHeader } from '@/components/shell/PageHeader';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import { useIsMobile } from '@/lib/useMediaQuery';
import styles from './MenuPage.module.css';

const SCREENS: Screen[] = [screens.calendar, screens.goals, screens.progress, screens.review, screens.library, screens.vision, screens.finance, screens.health, screens.assistant];

type MenuLink = { to: string; icon: IconName; label: string };

/** Phones: every screen the tab bar has no room for, with the ones you pin at the top. Larger windows have the top nav instead. */
export function MenuPage() {
  const t = useT();
  const isMobile = useIsMobile();
  const profile = useLiveQuery(getProfile);
  if (!isMobile) return <Navigate to="/" replace />;
  if (!profile) return null;

  const links: MenuLink[] = [
    ...SCREENS.map((s) => ({ to: s.path, icon: s.icon, label: s.key === 'library' ? t.shell.tabLibrary : s.navLabel })),
    { to: '/profile', icon: 'users', label: t.shell.profileAndSettings },
  ];
  const paths = profile.pinnedScreens ?? [];
  const pinned = paths.flatMap((path) => links.filter((link) => link.to === path));
  const others = links.filter((link) => !paths.includes(link.to));

  return (
    <div className={styles.page}>
      <PageHeader title={t.shell.menu} />
      {pinned.length > 0 && <Tiles title={t.shell.menuPinned} links={pinned} isPinned />}
      {others.length > 0 && <Tiles title={pinned.length > 0 ? t.shell.menuOther : undefined} links={others} isPinned={false} />}
    </div>
  );
}

function Tiles({ title, links, isPinned }: { title?: string; links: MenuLink[]; isPinned: boolean }) {
  const t = useT().shell;
  return (
    <section className={styles.section}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      <ul className={styles.grid} aria-label={title ?? t.menuScreens}>
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={styles.tile}>
              <span className={styles.icon} aria-hidden="true">
                <Icon name={link.icon} size={20} />
              </span>
              <span className={styles.label}>{link.label}</span>
            </Link>
            <button type="button" className={cx(styles.pin, isPinned && styles.pinOn)} aria-pressed={isPinned} aria-label={isPinned ? t.unpinScreen(link.label) : t.pinScreen(link.label)} onClick={() => void togglePinnedScreen(link.to)}>
              <Icon name="pin" size={17} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
