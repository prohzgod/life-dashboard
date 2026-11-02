import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { SlidingPill } from '@/components/ui';
import { useIsMobile } from '@/lib/useMediaQuery';
import { EmptyState } from '@/components/shell/EmptyState';
import { PageHeader } from '@/components/shell/PageHeader';
import { useT } from '@/i18n';
import { AppearanceSettings } from './AppearanceSettings';
import { GeneralSettings } from './GeneralSettings';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';
import styles from './SettingsPage.module.css';

const settingsTabs = ['general', 'privacy', 'notifications', 'modules', 'appearance'] as const;

type TabSlug = (typeof settingsTabs)[number];

export function SettingsPage() {
  const t = useT().settings;
  const { tab } = useParams();
  const slug = settingsTabs.find((s) => s === tab);
  const phone = useIsMobile();
  if (!slug) return <Navigate to="/settings/privacy" replace />;

  // Phones reach each section from Profile, so it reads as its own screen.
  if (phone) {
    return (
      <>
        <header className={styles.phoneHeader}>
          <Link to="/profile" className={styles.phoneBack} aria-label={t.backToProfile}>
            <Icon name="chevronLeft" size={18} />
            {t.profile}
          </Link>
          <h1 className={styles.phoneTitle}>{t.tabs[slug]}</h1>
        </header>
        <TabContent slug={slug} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t.title} />
      <nav aria-label={t.sections} className={styles.tabs}>
        <SlidingPill selector={`.${styles.active}`} className={styles.tabLine} />
        {settingsTabs.map((s) => (
          <NavLink key={s} to={`/settings/${s}`} className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}>
            {t.tabs[s]}
          </NavLink>
        ))}
      </nav>
      <TabContent slug={slug} />
    </>
  );
}

function TabContent({ slug }: { slug: TabSlug }) {
  const t = useT().settings;
  if (slug === 'general') return <GeneralSettings />;
  if (slug === 'appearance') return <AppearanceSettings />;
  if (slug === 'privacy') return <PrivacySettings />;
  if (slug === 'notifications') return <NotificationSettings />;
  return <EmptyState icon="settings" heading={t.placeholderHeading} body={t.modulesEmpty} />;
}
