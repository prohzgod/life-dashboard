import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { areasRepo, captureTask } from '@/data';
import { useToday } from '@/lib/useToday';
import { QuickAddField } from '../tasks/QuickAddField';
import { Dialog } from '../ui/Dialog';
import styles from './QuickCapture.module.css';

type QuickCaptureProps = { open: boolean; onClose: () => void };

/** ⌘N: one line into the Inbox, from anywhere. Sort it later. */
export function QuickCapture({ open, onClose }: QuickCaptureProps) {
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
      title="Quick capture"
    >
      <QuickAddField
        variant="box"
        label="Capture anything"
        placeholder="Capture anything. Natural language works."
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
            Saved “{saved}” to your <Link to="/inbox" onClick={onClose}>Inbox</Link>. Add another, or press Esc.
          </>
        ) : (
          'Press Enter to save to your Inbox. It works offline too.'
        )}
      </p>
    </Dialog>
  );
}
