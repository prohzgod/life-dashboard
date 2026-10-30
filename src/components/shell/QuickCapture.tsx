import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { areasRepo, captureTask } from '@/data';
import { useT } from '@/i18n';
import { useToday } from '@/lib/useToday';
import { QuickAddField } from '../tasks/QuickAddField';
import { Dialog } from '../ui/Dialog';
import styles from './QuickCapture.module.css';

type QuickCaptureProps = { open: boolean; onClose: () => void };

/** ⌘N: one line into the Inbox, from anywhere. Sort it later. */
export function QuickCapture({ open, onClose }: QuickCaptureProps) {
  const t = useT();
  const today = useToday();
  const loaded = useLiveQuery(() => areasRepo.listOrdered());
  const areas = useMemo(() => loaded ?? [], [loaded]);
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onClose={() => {
        setSaved(null);
        onClose();
      }}
      title={t.shell.quickCapture}
    >
      <QuickAddField
        variant="box"
        label={t.shell.capture.label}
        placeholder={t.shell.capture.placeholder}
        today={today}
        areas={areas}
        autoFocus
        onSubmit={async (text) => {
          const task = await captureTask(text, { today, status: 'inbox' });
          setSaved(task.title);
        }}
      />
      <p className={styles.status} role="status">
        {saved ? (
          <>
            {t.shell.capture.savedBefore(saved)}
            <Link to="/inbox" onClick={onClose}>
              {t.shell.capture.inbox}
            </Link>
            {t.shell.capture.savedAfter}
          </>
        ) : (
          t.shell.capture.hint
        )}
      </p>
    </Dialog>
  );
}
