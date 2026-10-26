import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Segmented.module.css';
import { cx } from './cx';

export type SegmentedOption<T extends string> = { value: T; label: ReactNode; icon?: ReactNode };

type SegmentedProps<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
};

/** A single-choice control: a radio group with roving focus and arrow-key movement. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={cx(styles.track, className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.option, selected && styles.selected)}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
