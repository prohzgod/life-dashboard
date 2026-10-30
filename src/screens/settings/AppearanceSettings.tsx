import { Icon } from '@/components/icons/Icon';
import { Card, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import type { ThemePreference } from '@/theme/theme';
import { useThemePreference } from '@/theme/useThemePreference';
import styles from './AppearanceSettings.module.css';

const themeIcons = { light: 'sun', dark: 'moon', system: 'monitor' } as const satisfies Record<ThemePreference, string>;

export function AppearanceSettings() {
  const t = useT().settings.appearance;
  const [theme, setTheme] = useThemePreference();
  const themeOptions = (['light', 'dark', 'system'] as const).map((value) => ({ value, label: t[value], icon: <Icon name={themeIcons[value]} size={16} /> }));

  return (
    <div className={styles.grid}>
      <Card title={t.theme}>
        <div className={styles.row}>
          <div className={styles.text}>
            <span id="theme-label" className={styles.label}>
              {t.colorTheme}
            </span>
            <span className={styles.hint}>{t.hint}</span>
          </div>
          <Segmented label={t.colorTheme} options={themeOptions} value={theme} onChange={setTheme} />
        </div>
      </Card>
    </div>
  );
}
