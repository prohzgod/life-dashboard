import { Card, Segmented } from '@/components/ui';
import { LOCALES, useLocale, useT } from '@/i18n';
import styles from './AppearanceSettings.module.css';

/** Settings › General: the language, for now. */
export function GeneralSettings() {
  const t = useT().settings.general;
  const [locale, setLocale] = useLocale();
  const options = LOCALES.map((value) => ({ value, label: <span lang={value}>{t.names[value]}</span> }));

  return (
    <div className={styles.grid}>
      <Card title={t.language}>
        <div className={styles.row}>
          <div className={styles.text}>
            <span className={styles.label}>{t.language}</span>
            <span className={styles.hint}>{t.languageHint}</span>
          </div>
          <Segmented label={t.language} options={options} value={locale} onChange={setLocale} />
        </div>
      </Card>
    </div>
  );
}
