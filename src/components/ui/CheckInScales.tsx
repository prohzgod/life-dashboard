import { Icon, type IconName } from '@/components/icons/Icon';
import styles from './CheckInScales.module.css';
import { cx } from './cx';

const FACES: IconName[] = ['moodAwful', 'moodLow', 'moodOkay', 'moodGood', 'moodGreat'];

type ScaleProps = { label: string; options: readonly string[]; value: number | null; onChange: (value: number | null) => void; className?: string };

/** Five faces, 48px; the chosen one fills with the accent. Tap it again to clear. Made for the dark panel. */
export function MoodPicker({ label, options, value, onChange, className }: ScaleProps) {
  return (
    <fieldset className={cx(styles.group, className)}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.moods}>
        {options.map((option, i) => {
          const on = value === i + 1;
          return (
            <button key={option} type="button" aria-pressed={on} className={cx(styles.choice, on && styles.on)} onClick={() => onChange(on ? null : i + 1)}>
              <span className={styles.face}>
                <Icon name={FACES[i]!} size={26} strokeWidth={1.7} />
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Five rising bars (20 → 60px), filled up to the level you pick. */
export function EnergyMeter({ label, options, value, onChange, className }: ScaleProps) {
  return (
    <fieldset className={cx(styles.group, className)}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.energies}>
        {options.map((option, i) => {
          const on = value === i + 1;
          return (
            <button key={option} type="button" aria-pressed={on} className={cx(styles.choice, on && styles.on)} onClick={() => onChange(on ? null : i + 1)}>
              <span className={cx(styles.bar, value !== null && i < value && styles.filled)} style={{ height: 20 + i * 10 }} />
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
