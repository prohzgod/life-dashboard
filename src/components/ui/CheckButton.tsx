import { Icon } from '../icons/Icon';
import styles from './CheckButton.module.css';
import { cx } from './cx';

type CheckButtonProps = {
  checked: boolean;
  onToggle: () => void;
  /** Accessible name, e.g. `Mark “Call Mom” as done`. */
  label: string;
  /** 20px in dense lists, 24px in Today's plan, 30px on habit tiles. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional content instead of the check, e.g. a count. */
  children?: React.ReactNode;
  disabled?: boolean;
};

/** A square check that toggles on its own (no label text), for task rows and habit tiles. */
export function CheckButton({ checked, onToggle, label, size = 'md', children, disabled }: CheckButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx(styles.check, styles[size], checked && styles.checked)}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {children ?? (checked && <Icon name="check" size={size === 'lg' ? 16 : 14} strokeWidth={2.4} />)}
    </button>
  );
}
