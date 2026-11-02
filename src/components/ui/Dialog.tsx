import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons/Icon';
import { messages } from '@/i18n';
import { useLastWhile, usePresence } from '@/lib/motion';
import styles from './Dialog.module.css';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * A modal on the native <dialog>: focus trap, Escape and the backdrop come from the browser.
 * Mark the element that should take focus on open with `data-autofocus`.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
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
      // showModal focuses the first focusable element (the close button); move to the field meant to have it.
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
      className={styles.dialog}
      data-closing={closing || undefined}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (event.target === ref.current) onClose();
      }}
    >
      {present && (
        <div className={styles.body}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {shownTitle}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label={messages().shell.close}>
              <Icon name="close" size={18} />
            </button>
          </header>
          {shownChildren}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
