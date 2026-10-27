import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ageOn, visibilityOf } from '@/domain/profile';
import { getPrivacyState, getProfile, listHomeWidgets, setAllVisibility, setFieldVisibility } from '@/data';
import { lockNow } from '@/components/shell/lock';
import { Icon, type IconName } from '@/components/icons/Icon';
import { ProfileAvatar } from '@/components/shell/ProfileAvatar';
import { cx } from '@/components/ui/cx';
import { formatDayShort } from '@/lib/format';
import { useToday } from '@/lib/useToday';
import { useThemePreference } from '@/theme/useThemePreference';
import { ABOUT_FIELDS, fieldValue } from './fields';
import styles from './Profile.module.css';

/** Profile: who you are, what's blurred on screen, and the way into Settings. */
export function ProfilePage() {
  const today = useToday();
  const [theme] = useThemePreference();
  const data = useLiveQuery(async () => ({ profile: await getProfile(), widgets: (await listHomeWidgets()).filter((w) => !w.hidden).length, locked: Boolean((await getPrivacyState()).lock.passcode) }));
  if (!data) return null;
  const { profile } = data;
  const vis = (field: string) => visibilityOf(profile.visibility, field);
  const rows = [
    ...(profile.birthday ? [{ key: 'age', field: 'birthday', label: 'Age', value: String(ageOn(profile.birthday, today)) }] : []),
    ...ABOUT_FIELDS.filter((f) => fieldValue(profile, f.key)).map((f) => ({
      key: f.key,
      field: f.key,
      label: f.label,
      value: f.key === 'birthday' ? formatDayShort(profile.birthday!).slice(4) + ` ${profile.birthday!.slice(0, 4)}` : fieldValue(profile, f.key),
    })),
    ...profile.customFields.filter((c) => c.value).map((c) => ({ key: c.id, field: c.id, label: c.label, value: c.value })),
  ];
  const allBlurred = rows.length > 0 && rows.every((r) => vis(r.field) === 'blurred');

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.back} aria-label="Back to Home">
          <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
          Home
        </Link>
        <h1 className={styles.topTitle}>Profile</h1>
        <Link to="/profile/edit" className={styles.edit}>
          Edit
        </Link>
      </header>

      <section className={styles.hero} aria-label="You">
        <ProfileAvatar size="lg" asLink={false} />
        <Blurrable blurred={vis('displayName') === 'blurred'} label="name" className={styles.name}>
          {profile.displayName || 'Your name'}
        </Blurrable>
        {profile.quote && (
          <Blurrable blurred={vis('quote') === 'blurred'} label="quote" className={styles.quote}>
            “{profile.quote}”
          </Blurrable>
        )}
        <div className={styles.chips}>
          <span className={styles.chip}>Personal space</span>
          {profile.occupation && vis('occupation') === 'shown' && <span className={styles.chip}>{profile.occupation}</span>}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="about-you">
        <div className={styles.cardHead}>
          <div>
            <h2 id="about-you" className={styles.cardTitle}>
              About you
            </h2>
            <p className={styles.hint}>Tap the eye to blur a detail on screen</p>
          </div>
          {rows.length > 0 && (
            <button type="button" className={styles.blurAll} onClick={() => void setAllVisibility(!allBlurred)}>
              <Icon name={allBlurred ? 'eye' : 'eyeOff'} size={16} />
              {allBlurred ? 'Show all' : 'Blur all'}
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className={styles.emptyRows}>
            Nothing here yet. <Link to="/profile/edit">Add your details</Link>; you choose what shows.
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
                  aria-label={`Blur ${r.label.toLowerCase()}`}
                  onClick={() => void setFieldVisibility(r.field, vis(r.field) === 'blurred' ? 'shown' : 'blurred')}
                >
                  <Icon name={vis(r.field) === 'blurred' ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            ))}
          </dl>
        )}
      </section>

      <nav className={styles.card} aria-label="Settings">
        <ul className={styles.settings}>
          <SettingRow icon="lock" label="Privacy & data" detail="On this phone" to="/settings/privacy" />
          <SettingRow icon="palette" label="Appearance" detail={theme[0]!.toUpperCase() + theme.slice(1)} to="/settings/appearance" />
          <SettingRow icon="widgets" label="Home & modules" detail={`${data.widgets} widgets`} to="/home/edit" />
          <SettingRow icon="bell" label="Notifications" detail="Review on Sun" to="/settings/general" />
          <SettingRow icon="users" label="Spaces" detail="Personal" to="/settings/spaces" />
          <SettingRow icon="download" label="Backup & export" detail="Encrypted backups" to="/settings/privacy" />
        </ul>
      </nav>

      {data.locked ? (
        <button type="button" className={styles.lockButton} onClick={lockNow}>
          <Icon name="lock" size={17} />
          Lock app now
        </button>
      ) : (
        <Link to="/settings/privacy" className={styles.lockButton}>
          <Icon name="lock" size={17} />
          Set up an app lock
        </Link>
      )}

      <p className={styles.footnote}>Your profile lives on this phone. Blurred details stay blurred until you tap them.</p>
    </div>
  );
}

/** A value shown blurred until tapped (and blurred again on the next tap). */
function Blurrable({ blurred, label, className, children }: { blurred: boolean; label: string; className?: string; children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  if (!blurred) return <span className={className}>{children}</span>;
  return (
    <button type="button" className={cx(styles.blurrable, className, !revealed && styles.blurred)} aria-label={revealed ? undefined : `Show ${label}`} aria-pressed={revealed} onClick={() => setRevealed((r) => !r)}>
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


