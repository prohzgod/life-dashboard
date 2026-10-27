import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { parseCapture } from '@/domain/quickAdd';
import { appendToJournal, areasRepo, captureTask, createNoteFromText } from '@/data';
import { CaptureChips } from '../tasks/CaptureChips';
import { Icon } from '../icons/Icon';
import { Button, Chip, Segmented, Sheet } from '../ui';
import { useToday } from '@/lib/useToday';
import { useOnlineStatus } from './useOnlineStatus';
import styles from './MobileCapture.module.css';

type Kind = 'task' | 'note' | 'journal';

const KINDS = [
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'journal', label: 'Journal' },
] as const;

const PLACEHOLDERS: Record<Kind, string> = {
  task: 'Pay rent every 1st #finance !high',
  note: 'First line is the title…',
  journal: 'Something worth remembering about today…',
};

/** The + button on phones: a task, a note or a journal line, saved on this phone first. */
export function MobileCapture({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Quick capture">
      {open && <CaptureBody onClose={onClose} />}
    </Sheet>
  );
}

function CaptureBody({ onClose }: { onClose: () => void }) {
  const today = useToday();
  const online = useOnlineStatus();
  const loaded = useLiveQuery(() => areasRepo.listOrdered());
  const areas = useMemo(() => loaded ?? [], [loaded]);
  const [kind, setKind] = useState<Kind>('task');
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const parsed = useMemo(() => (kind === 'task' && text.trim() ? parseCapture(text, { today, areaNames: areas.map((a) => a.name) }) : null), [kind, text, today, areas]);

  async function save() {
    if (!text.trim()) return;
    if (kind === 'task') {
      const task = await captureTask(text.trim(), { today, status: 'inbox' });
      setSaved(`“${task.title}” is in your Inbox.`);
    } else if (kind === 'note') {
      const node = await createNoteFromText(text);
      setSaved(`“${node.title}” is in your Library.`);
    } else {
      await appendToJournal(today, text);
      setSaved('Added to today’s journal page.');
    }
    setText('');
  }

  return (
    <div className={styles.body}>
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
      <Segmented label="What are you capturing?" options={KINDS} value={kind} onChange={(k) => setKind(k)} className={styles.kinds} />
      <textarea
        className={styles.text}
        aria-label={`New ${kind}`}
        placeholder={PLACEHOLDERS[kind]}
        value={text}
        rows={3}
        data-autofocus
        onChange={(e) => {
          setText(e.target.value);
          setSaved('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (kind === 'task' && !e.shiftKey))) {
            e.preventDefault();
            void save();
          }
        }}
      />
      {parsed && (
        <div className={styles.understood}>
          <span className={styles.label}>Understood as</span>
          <div className={styles.chips}>
            <Chip>Task</Chip>
            <CaptureChips parsed={parsed} today={today} areas={areas} />
          </div>
        </div>
      )}
      <Button variant="primary" className={styles.save} onClick={() => void save()} disabled={!text.trim()}>
        Save
      </Button>
      <p className={styles.status} role="status">
        {saved}
      </p>
      {!online && (
        <p className={styles.offline}>
          <Icon name="offline" size={16} />
          You’re offline. It’s saved on this phone either way.
        </p>
      )}
    </div>
  );
}
