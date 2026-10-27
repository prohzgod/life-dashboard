import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Sheet.module.css';
import { cx } from './cx';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name; shown as the sheet's heading unless `hideTitle`. */
  title: string;
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * A bottom sheet on the native <dialog> (focus trap, Escape and backdrop come from the browser).
 * Mark the element that should take focus with `data-autofocus`.
 */
export function Sheet({ open, onClose, title, hideTitle, children, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx(styles.sheet, className)}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className={styles.body}>
          <span className={styles.handle} aria-hidden="true" />
          <h2 id={titleId} className={hideTitle ? 'visually-hidden' : styles.title}>
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
