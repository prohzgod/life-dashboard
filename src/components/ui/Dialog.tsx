import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import styles from './Dialog.module.css';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** A modal on the native <dialog>: focus trap, Escape and the backdrop come from the browser. */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="dialog-title"
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
      {open && (
        <div className={styles.body}>
          <header className={styles.header}>
            <h2 id="dialog-title" className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
