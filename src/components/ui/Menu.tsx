import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '@/lib/motion';
import { Icon, type IconName } from '../icons/Icon';
import styles from './Menu.module.css';
import { cx } from './cx';

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean; icon?: IconName; current?: boolean };

type MenuProps = {
  /** Accessible name of the button that opens the menu. */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
  className?: string;
  /** Replaces the round icon trigger's look, e.g. the menu button in the top nav. */
  triggerClassName?: string;
};

/**
 * A button that opens a short list of actions. Arrow keys move, Escape closes.
 * The list renders in a portal with fixed position under the button, so a parent that scrolls or
 * clips (the top nav pill) can't cut it off.
 */
export function Menu({ label, trigger, items, className, triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const [place, setPlace] = useState<CSSProperties>();
  const { present, closing } = usePresence(open, menuRef);

  // Under the button, right edges lined up; follows the button when the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setPlace({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current.find((el) => el && !el.disabled)?.focus();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
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
      {present &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className={styles.menu}
            style={place}
            data-closing={closing || undefined}
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
                aria-current={item.current ? 'page' : undefined}
                className={cx(styles.item, item.danger && styles.danger, item.current && styles.current)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon && <Icon name={item.icon} size={18} />}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
