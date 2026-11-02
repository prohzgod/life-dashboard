import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLastWhile, usePresence } from '@/lib/motion';
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
  const { present, closing } = usePresence(open, ref);
  // While it closes, keep showing what it last showed: the owner has usually cleared its state.
  const shownTitle = useLastWhile(open, title);
  const shownChildren = useLastWhile(open, children);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Before showModal, which can't focus anything inside an inert dialog.
    dialog.inert = !open;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      // Closed for real straight away, so focus goes back and the page works while it animates out.
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  // In <body>: once closed it leaves the top layer, and a glass parent would trap or clip what's left of it.
  return createPortal(
    <dialog
      ref={ref}
      className={cx(styles.sheet, className)}
      data-closing={closing || undefined}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {present && (
        <div className={styles.body}>
          <span className={styles.handle} aria-hidden="true" />
          <h2 id={titleId} className={hideTitle ? 'visually-hidden' : styles.title}>
            {shownTitle}
          </h2>
          {shownChildren}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
