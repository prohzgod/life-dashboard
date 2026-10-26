import { Navigate, NavLink, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/shell/EmptyState';
import { PageHeader } from '@/components/shell/PageHeader';
import { AppearanceSettings } from './AppearanceSettings';
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
  if (!current) return <Navigate to="/settings/privacy" replace />;

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
  return <EmptyState icon="settings" heading="Arrives with your data" body={empty} />;
}
