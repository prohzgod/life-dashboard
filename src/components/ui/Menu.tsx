import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import styles from './Menu.module.css';
import { cx } from './cx';

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean };

type MenuProps = {
  /** Accessible name of the button that opens the menu. */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
  className?: string;
  /** Replaces the round icon trigger's look, e.g. the "More" item in the top nav. */
  triggerClassName?: string;
};

/** A button that opens a short list of actions. Arrow keys move, Escape closes. */
export function Menu({ label, trigger, items, className, triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current.find((el) => el && !el.disabled)?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <button
        ref={buttonRef}
        type="button"
        className={triggerClassName ?? styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={styles.menu}
          onKeyDown={(event) => {
            const enabled = itemRefs.current.filter((el): el is HTMLButtonElement => !!el && !el.disabled);
            const at = enabled.indexOf(document.activeElement as HTMLButtonElement);
            if (event.key === 'Escape') close();
            else if (event.key === 'ArrowDown') enabled[(at + 1) % enabled.length]?.focus();
            else if (event.key === 'ArrowUp') enabled[(at - 1 + enabled.length) % enabled.length]?.focus();
            else return;
            event.preventDefault();
          }}
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cx(styles.item, item.danger && styles.danger)}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
