import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import { Card, Segmented } from '@/components/ui';
import type { ThemePreference } from '@/theme/theme';
import { useThemePreference } from '@/theme/useThemePreference';
import styles from './AppearanceSettings.module.css';

const themeOptions = [
  { value: 'light', label: 'Light', icon: <Icon name="sun" size={16} /> },
  { value: 'dark', label: 'Dark', icon: <Icon name="moon" size={16} /> },
  { value: 'system', label: 'System', icon: <Icon name="monitor" size={16} /> },
] as const satisfies ReadonlyArray<{ value: ThemePreference; label: string; icon: ReactNode }>;

export function AppearanceSettings() {
  const [theme, setTheme] = useThemePreference();

  return (
    <div className={styles.grid}>
      <Card title="Theme">
        <div className={styles.row}>
          <div className={styles.text}>
            <span id="theme-label" className={styles.label}>
              Color theme
            </span>
            <span className={styles.hint}>Saved on this device only. System follows your computer’s setting.</span>
          </div>
          <Segmented label="Color theme" options={themeOptions} value={theme} onChange={setTheme} />
        </div>
      </Card>
    </div>
  );
}
