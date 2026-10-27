import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { useIsMobile } from '@/lib/useMediaQuery';
import { EmptyState } from '@/components/shell/EmptyState';
import { PageHeader } from '@/components/shell/PageHeader';
import { AppearanceSettings } from './AppearanceSettings';
import { PrivacySettings } from './PrivacySettings';
import styles from './SettingsPage.module.css';

const settingsTabs = [
  { slug: 'general', label: 'General', empty: 'Your name, week start and language.' },
  { slug: 'spaces', label: 'Spaces & sharing', empty: 'A shared Family space, alongside your Personal one.' },
  { slug: 'privacy', label: 'Privacy & data', empty: 'Storage on this device, sync, encryption, backups, and export and import.' },
  { slug: 'modules', label: 'Modules', empty: 'Turn Calendar, Finance, Health, Assistant and Vision board on or off. Nothing is deleted.' },
  { slug: 'appearance', label: 'Appearance', empty: '' },
] as const;

type TabSlug = (typeof settingsTabs)[number]['slug'];

export function SettingsPage() {
  const { tab } = useParams();
  const current = settingsTabs.find((t) => t.slug === tab);
  const phone = useIsMobile();
  if (!current) return <Navigate to="/settings/privacy" replace />;

  // Phones reach each section from Profile, so it reads as its own screen.
  if (phone) {
    return (
      <>
        <header className={styles.phoneHeader}>
          <Link to="/profile" className={styles.phoneBack} aria-label="Back to Profile">
            <Icon name="chevronLeft" size={18} />
            Profile
          </Link>
          <h1 className={styles.phoneTitle}>{current.label}</h1>
        </header>
        <TabContent slug={current.slug} empty={current.empty} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Settings" />
      <nav aria-label="Settings sections" className={styles.tabs}>
        {settingsTabs.map((t) => (
          <NavLink key={t.slug} to={`/settings/${t.slug}`} className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <TabContent slug={current.slug} empty={current.empty} />
    </>
  );
}

function TabContent({ slug, empty }: { slug: TabSlug; empty: string }) {
  if (slug === 'appearance') return <AppearanceSettings />;
  if (slug === 'privacy') return <PrivacySettings />;
  return <EmptyState icon="settings" heading="Arrives with your data" body={empty} />;
}
