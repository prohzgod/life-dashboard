import { Link, Navigate } from 'react-router-dom';
import { screens, type Screen } from '@/app/screens';
import { Icon, type IconName } from '@/components/icons/Icon';
import { PageHeader } from '@/components/shell/PageHeader';
import { useT } from '@/i18n';
import { useIsMobile } from '@/lib/useMediaQuery';
import styles from './MenuPage.module.css';

const SCREENS: Screen[] = [screens.calendar, screens.goals, screens.progress, screens.review, screens.library, screens.vision, screens.finance, screens.health, screens.assistant];

/** Phones: every screen the tab bar has no room for. Larger windows have the top nav instead. */
export function MenuPage() {
  const t = useT();
  const isMobile = useIsMobile();
  if (!isMobile) return <Navigate to="/" replace />;

  const links: Array<{ to: string; icon: IconName; label: string }> = [
    ...SCREENS.map((s) => ({ to: s.path, icon: s.icon, label: s.key === 'library' ? t.shell.tabLibrary : s.navLabel })),
    { to: '/profile', icon: 'users', label: t.shell.profileAndSettings },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title={t.shell.menu} />
      <ul className={styles.grid} aria-label={t.shell.menuScreens}>
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={styles.tile}>
              <span className={styles.icon} aria-hidden="true">
                <Icon name={link.icon} size={20} />
              </span>
              <span className={styles.label}>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
