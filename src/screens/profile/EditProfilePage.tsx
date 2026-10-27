import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ageOn, visibilityOf, type Visibility } from '@/domain/profile';
import { getProfile, newCustomField, saveProfile, setProfilePhoto, type Profile } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { ProfileAvatar } from '@/components/shell/ProfileAvatar';
import { Button } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { prepareImage } from '@/lib/images';
import { useToday } from '@/lib/useToday';
import { ABOUT_FIELDS, GENDERS } from './fields';
import styles from './Profile.module.css';

export function EditProfilePage() {
  const profile = useLiveQuery(getProfile);
  if (!profile) return null;
  return <Form key={profile.id} profile={profile} />;
}

type FormState = Pick<Profile, 'displayName' | 'quote' | 'gender' | 'birthday' | 'pronouns' | 'occupation' | 'city' | 'email' | 'phone' | 'customFields' | 'visibility'>;

function Form({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const today = useToday();
  const id = useId();
  const photoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>({
    displayName: profile.displayName,
    quote: profile.quote,
    gender: profile.gender,
    birthday: profile.birthday,
    pronouns: profile.pronouns,
    occupation: profile.occupation,
    city: profile.city,
    email: profile.email,
    phone: profile.phone,
    customFields: profile.customFields,
    visibility: profile.visibility,
  });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const vis = (field: string) => visibilityOf(form.visibility, field);
  const toggle = (field: string) => set('visibility', { ...form.visibility, [field]: vis(field) === 'shown' ? 'blurred' : 'shown' });

  async function save() {
    await saveProfile({
      ...form,
      displayName: form.displayName.trim(),
      quote: form.quote.trim(),
      customFields: form.customFields.filter((c) => c.label.trim()),
    });
    navigate('/profile');
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <button type="button" className={styles.cancel} onClick={() => navigate('/profile')}>
          Cancel
        </button>
        <h1 className={styles.topTitle}>Edit profile</h1>
        <Button variant="primary" className={styles.save} onClick={() => void save()}>
          Save
        </Button>
      </header>

      <div className={styles.photoRow}>
        <ProfileAvatar size="lg" asLink={false} />
        <div className={styles.photoActions}>
          <Button size="sm" icon={<Icon name="camera" size={15} />} onClick={() => photoRef.current?.click()}>
            {profile.photoAttachmentId ? 'Change photo' : 'Add a photo'}
          </Button>
          {profile.photoAttachmentId ? (
            <button type="button" className={styles.link} onClick={() => void setProfilePhoto(null)}>
              Use my initial instead
            </button>
          ) : (
            <span className={styles.hint}>Or keep your initial</span>
          )}
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          hidden
          aria-label="Choose a profile photo"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) await setProfilePhoto(await prepareImage(file, 400));
          }}
        />
      </div>

      <Field id={`${id}-name`} label="Display name" visibility={vis('displayName')} onToggle={() => toggle('displayName')}>
        <input id={`${id}-name`} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="What should we call you?" autoComplete="name" />
      </Field>

      <Field id={`${id}-quote`} label="Quote or motto" visibility={vis('quote')} onToggle={() => toggle('quote')} note="Shown under your name.">
        <textarea id={`${id}-quote`} className={styles.quoteInput} rows={2} value={form.quote} onChange={(e) => set('quote', e.target.value)} placeholder="Slow is smooth, and smooth is fast." />
      </Field>

      <Field id={`${id}-gender`} label="Gender" visibility={vis('gender')} onToggle={() => toggle('gender')} group>
        <div className={styles.choices} role="radiogroup" aria-labelledby={`${id}-gender`}>
          {GENDERS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={form.gender === g} className={cx(styles.choice, form.gender === g && styles.choiceOn)} onClick={() => set('gender', form.gender === g ? '' : g)}>
              {g}
            </button>
          ))}
        </div>
      </Field>

      {ABOUT_FIELDS.filter((f) => f.key !== 'gender').map((f) => (
        <Field
          key={f.key}
          id={`${id}-${f.key}`}
          label={f.label}
          visibility={vis(f.key)}
          onToggle={() => toggle(f.key)}
          note={
            f.key === 'birthday' && form.birthday
              ? `Your age (${ageOn(form.birthday, today)}) is worked out from this and blurred with it.`
              : f.key === 'email'
                ? 'Only kept on this phone. Never shared.'
                : undefined
          }
        >
          <input
            id={`${id}-${f.key}`}
            type={f.type ?? 'text'}
            inputMode={f.inputMode}
            placeholder={f.placeholder}
            value={(f.key === 'birthday' ? (form.birthday ?? '') : form[f.key]) as string}
            onChange={(e) => set(f.key, (f.key === 'birthday' ? e.target.value || null : e.target.value) as never)}
          />
        </Field>
      ))}

      {form.customFields.map((c, i) => (
        <div key={c.id} className={styles.field}>
          <div className={styles.fieldHead}>
            <input
              className={styles.customLabel}
              aria-label="Field name"
              placeholder="Field name"
              value={c.label}
              onChange={(e) => set('customFields', form.customFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <VisibilityToggle visibility={vis(c.id)} label={c.label || 'this field'} onToggle={() => toggle(c.id)} />
          </div>
          <div className={cx(styles.inputWrap, vis(c.id) === 'blurred' && styles.blurInput)}>
            <input aria-label={`${c.label || 'Custom field'} value`} value={c.value} onChange={(e) => set('customFields', form.customFields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          </div>
          <button type="button" className={styles.link} onClick={() => set('customFields', form.customFields.filter((_, j) => j !== i))}>
            Remove this field
          </button>
        </div>
      ))}

      <button type="button" className={styles.addField} onClick={() => set('customFields', [...form.customFields, newCustomField('')])}>
        <Icon name="plus" size={16} />
        Add a field (blood type, emergency contact…)
      </button>

      <p className={styles.note}>
        <Icon name="lock" size={15} />
        Blurred details stay blurred until you tap them, and the Assistant never reads them.
      </p>
    </div>
  );
}

function Field({ id, label, visibility, onToggle, note, group, children }: { id: string; label: string; visibility: Visibility; onToggle: () => void; note?: string; group?: boolean; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        {group ? (
          <span id={id} className={styles.fieldLabel}>
            {label}
          </span>
        ) : (
          <label htmlFor={id} className={styles.fieldLabel}>
            {label}
          </label>
        )}
        <VisibilityToggle visibility={visibility} label={label.toLowerCase()} onToggle={onToggle} />
      </div>
      <div className={cx(styles.inputWrap, visibility === 'blurred' && styles.blurInput)}>{children}</div>
      {note && <p className={styles.hint}>{note}</p>}
    </div>
  );
}

function VisibilityToggle({ visibility, label, onToggle }: { visibility: Visibility; label: string; onToggle: () => void }) {
  const blurred = visibility === 'blurred';
  return (
    <button type="button" className={cx(styles.vis, blurred && styles.visBlurred)} aria-pressed={blurred} aria-label={`Blur ${label}`} onClick={onToggle}>
      <Icon name={blurred ? 'eyeOff' : 'eye'} size={15} />
      {blurred ? 'Blurred' : 'Shown'}
    </button>
  );
}
