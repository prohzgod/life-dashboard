import { useMemo, useState, type FormEvent } from 'react';
import { parseCapture } from '@/domain/quickAdd';
import type { Day } from '@/domain/days';
import type { LifeArea } from '@/data';
import { useT } from '@/i18n';
import { Icon } from '../icons/Icon';
import { CaptureChips } from './CaptureChips';
import styles from './QuickAddField.module.css';

type QuickAddFieldProps = {
  label: string;
  placeholder: string;
  today: Day;
  areas: readonly LifeArea[];
  onSubmit: (text: string) => Promise<unknown>;
  /** "inline" sits in a card (Today); "box" is the Inbox capture box with an example line. */
  variant?: 'inline' | 'box';
  autoFocus?: boolean;
};

/** A one-line add field that parses as you type and shows what it understood. */
export function QuickAddField({ label, placeholder, today, areas, onSubmit, variant = 'inline', autoFocus }: QuickAddFieldProps) {
  const t = useT().tasks;
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(
    () => (text.trim() ? parseCapture(text, { today, areaNames: areas.map((a) => a.name) }) : null),
    [text, today, areas],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={variant === 'box' ? styles.box : styles.inline} onSubmit={submit}>
      <label className={styles.field}>
        <Icon name="plus" size={16} strokeWidth={2} className={styles.plus} />
        <input
          className={styles.input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          autoFocus={autoFocus}
          data-autofocus={autoFocus || undefined}
          enterKeyHint="done"
        />
        {variant === 'inline' && <kbd className={styles.kbd}>{t.enter}</kbd>}
      </label>
      {parsed ? (
        <div className={styles.preview}>
          <CaptureChips parsed={parsed} today={today} areas={areas} />
        </div>
      ) : (
        variant === 'box' && (
          <p className={styles.example}>{t.example}</p>
        )
      )}
    </form>
  );
}
