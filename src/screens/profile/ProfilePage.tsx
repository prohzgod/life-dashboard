import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ageOn, visibilityOf } from '@/domain/profile';
import { getPrivacyState, getProfile, getReminderPrefs, listHomeWidgets, setAllVisibility, setFieldVisibility } from '@/data';
import { lockNow } from '@/components/shell/lock';
import { Icon, type IconName } from '@/components/icons/Icon';
import { ProfileAvatar } from '@/components/shell/ProfileAvatar';
import { cx } from '@/components/ui/cx';
import { formatDate } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { useThemePreference } from '@/theme/useThemePreference';
import { ABOUT_FIELDS, fieldValue } from './fields';
import { useLocale, useT } from '@/i18n';
import styles from './Profile.module.css';

/** Profile: who you are, what's blurred on screen, and the way into Settings. */
export function ProfilePage() {
  const { profile: t, settings } = useT();
  const [locale] = useLocale();
  const today = useToday();
  const [theme] = useThemePreference();
  const data = useLiveQuery(async () => ({ profile: await getProfile(), widgets: (await listHomeWidgets()).filter((w) => !w.hidden).length, locked: Boolean((await getPrivacyState()).lock.passcode) }));
  const reminders = useLiveQuery(getReminderPrefs);
  if (!data) return null;
  const { profile } = data;
  const vis = (field: string) => visibilityOf(profile.visibility, field);
  const rows = [
    ...(profile.birthday ? [{ key: 'age', field: 'birthday', label: t.age, value: String(ageOn(profile.birthday, today)) }] : []),
    ...ABOUT_FIELDS.filter((f) => fieldValue(profile, f.key)).map((f) => ({
      key: f.key,
      field: f.key,
      label: t.fields[f.key].label,
      value: f.key === 'birthday' ? formatDate(profile.birthday!) : f.key === 'gender' ? (t.genders[profile.gender] ?? profile.gender) : fieldValue(profile, f.key),
    })),
    ...profile.customFields.filter((c) => c.value).map((c) => ({ key: c.id, field: c.id, label: c.label, value: c.value })),
  ];
  const allBlurred = rows.length > 0 && rows.every((r) => vis(r.field) === 'blurred');

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.back} aria-label={t.backHome}>
          <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
          {t.home}
        </Link>
        <h1 className={styles.topTitle}>{t.title}</h1>
        <Link to="/profile/edit" className={styles.edit}>
          {t.edit}
        </Link>
      </header>

      <section className={styles.hero} aria-label={t.you}>
        <ProfileAvatar size="lg" asLink={false} />
        <Blurrable blurred={vis('displayName') === 'blurred'} label={t.name} className={styles.name}>
          {profile.displayName || t.yourName}
        </Blurrable>
        {profile.quote && (
          <Blurrable blurred={vis('quote') === 'blurred'} label={t.quote} className={styles.quote}>
            “{profile.quote}”
          </Blurrable>
        )}
        {profile.occupation && vis('occupation') === 'shown' && (
          <div className={styles.chips}>
            <span className={styles.chip}>{profile.occupation}</span>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="about-you">
        <div className={styles.cardHead}>
          <div>
            <h2 id="about-you" className={styles.cardTitle}>
              {t.about}
            </h2>
            <p className={styles.hint}>{t.eyeHint}</p>
          </div>
          {rows.length > 0 && (
            <button type="button" className={styles.blurAll} onClick={() => void setAllVisibility(!allBlurred)}>
              <Icon name={allBlurred ? 'eye' : 'eyeOff'} size={16} />
              {allBlurred ? t.showAll : t.blurAll}
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className={styles.emptyRows}>
            {t.emptyBefore} <Link to="/profile/edit">{t.addDetails}</Link>
            {t.emptyAfter}
          </p>
        ) : (
          <dl className={styles.rows}>
            {rows.map((r) => (
              <div key={r.key} className={styles.row}>
                <dt>{r.label}</dt>
                <dd>
                  <Blurrable blurred={vis(r.field) === 'blurred'} label={r.label.toLowerCase()}>
                    {r.value}
                  </Blurrable>
                </dd>
                <button
                  type="button"
                  className={cx(styles.eye, vis(r.field) === 'shown' && styles.eyeOn)}
                  aria-pressed={vis(r.field) === 'blurred'}
                  aria-label={t.blur(r.label.toLowerCase())}
                  onClick={() => void setFieldVisibility(r.field, vis(r.field) === 'blurred' ? 'shown' : 'blurred')}
                >
                  <Icon name={vis(r.field) === 'blurred' ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            ))}
          </dl>
        )}
      </section>

      <nav className={styles.card} aria-label={t.settings}>
        <ul className={styles.settings}>
          <SettingRow icon="lock" label={t.rows.privacy} detail={t.rows.onPhone} to="/settings/privacy" />
          <SettingRow icon="globe" label={t.rows.language} detail={settings.general.names[locale]} to="/settings/general" />
          <SettingRow icon="palette" label={t.rows.appearance} detail={t.rows.themes[theme]} to="/settings/appearance" />
          <SettingRow icon="widgets" label={t.rows.home} detail={t.rows.widgets(data.widgets)} to="/home/edit" />
          <SettingRow icon="bell" label={t.rows.notifications} detail={reminders?.enabled ? t.rows.on : t.rows.off} to="/settings/notifications" />
          <SettingRow icon="download" label={t.rows.backup} detail={t.rows.encrypted} to="/settings/privacy" />
        </ul>
      </nav>

      {data.locked ? (
        <button type="button" className={styles.lockButton} onClick={lockNow}>
          <Icon name="lock" size={17} />
          {t.lockNow}
        </button>
      ) : (
        <Link to="/settings/privacy" className={styles.lockButton}>
          <Icon name="lock" size={17} />
          {t.setUpLock}
        </Link>
      )}

      <p className={styles.footnote}>{t.footnote}</p>
    </div>
  );
}

/** A value shown blurred until tapped (and blurred again on the next tap). */
function Blurrable({ blurred, label, className, children }: { blurred: boolean; label: string; className?: string; children: React.ReactNode }) {
  const t = useT().profile;
  const [revealed, setRevealed] = useState(false);
  if (!blurred) return <span className={className}>{children}</span>;
  return (
    <button type="button" className={cx(styles.blurrable, className, !revealed && styles.blurred)} aria-label={revealed ? undefined : t.show(label)} aria-pressed={revealed} onClick={() => setRevealed((r) => !r)}>
      <span aria-hidden={!revealed}>{children}</span>
    </button>
  );
}

function SettingRow({ icon, label, detail, to }: { icon: IconName; label: string; detail: string; to: string }) {
  return (
    <li>
      <Link to={to} className={styles.setting}>
        <span className={styles.settingIcon}>
          <Icon name={icon} size={17} />
        </span>
        <span className={styles.grow}>{label}</span>
        <span className={styles.detail}>{detail}</span>
        <Icon name="chevronRight" size={16} className={styles.chev} />
      </Link>
    </li>
  );
}


