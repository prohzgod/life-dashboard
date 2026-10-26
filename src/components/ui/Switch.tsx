import styles from './Switch.module.css';
import { cx } from './cx';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name. Pass `labelledBy` instead when a visible label sits elsewhere. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked, onChange, label, labelledBy, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={cx(styles.switch, checked && styles.on, className)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}
