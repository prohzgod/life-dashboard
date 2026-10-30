import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { parseCapture } from '@/domain/quickAdd';
import { appendToJournal, areasRepo, captureTask, createNoteFromText } from '@/data';
import { CaptureChips } from '../tasks/CaptureChips';
import { Icon } from '../icons/Icon';
import { Button, Chip, Segmented, Sheet } from '../ui';
import { useT } from '@/i18n';
import { useToday } from '@/lib/useToday';
import { useOnlineStatus } from './useOnlineStatus';
import styles from './MobileCapture.module.css';

type Kind = 'task' | 'note' | 'journal';

const KINDS: Kind[] = ['task', 'note', 'journal'];

/** The + button on phones: a task, a note or a journal line, saved on this phone first. */
export function MobileCapture({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t.shell.quickCapture}>
      {open && <CaptureBody onClose={onClose} />}
    </Sheet>
  );
}

function CaptureBody({ onClose }: { onClose: () => void }) {
  const t = useT();
  const c = t.shell.capture;
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
      setSaved(c.taskSaved(task.title));
    } else if (kind === 'note') {
      const node = await createNoteFromText(text);
      setSaved(c.noteSaved(node.title));
    } else {
      await appendToJournal(today, text);
      setSaved(c.journalSaved);
    }
    setText('');
  }

  return (
    <div className={styles.body}>
      <button type="button" className={styles.close} aria-label={t.shell.close} onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
      <Segmented label={c.whatKind} options={KINDS.map((k) => ({ value: k, label: c.kinds[k] }))} value={kind} onChange={(k) => setKind(k)} className={styles.kinds} />
      <textarea
        className={styles.text}
        aria-label={c.newKind[kind]}
        placeholder={c.placeholders[kind]}
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
          <span className={styles.label}>{c.understoodAs}</span>
          <div className={styles.chips}>
            <Chip>{c.kinds.task}</Chip>
            <CaptureChips parsed={parsed} today={today} areas={areas} />
          </div>
        </div>
      )}
      <Button variant="primary" className={styles.save} onClick={() => void save()} disabled={!text.trim()}>
        {c.save}
      </Button>
      <p className={styles.status} role="status">
        {saved}
      </p>
      {!online && (
        <p className={styles.offline}>
          <Icon name="offline" size={16} />
          {c.offline}
        </p>
      )}
    </div>
  );
}
