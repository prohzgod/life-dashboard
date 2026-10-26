import { useId, type ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import styles from './Checkbox.module.css';
import { cx } from './cx';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Strike through the label once checked, as for a done task. */
  strikeWhenChecked?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Checkbox({ checked, onChange, label, strikeWhenChecked = true, disabled, className }: CheckboxProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx(styles.row, disabled && styles.disabled, className)}>
      <input
        id={id}
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        <Icon name="check" size={14} strokeWidth={2.4} />
      </span>
      <span className={cx(styles.label, checked && strikeWhenChecked && styles.done)}>{label}</span>
    </label>
  );
}
