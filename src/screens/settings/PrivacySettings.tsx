import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, type ChangeEvent } from 'react';
import { Button, Card } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { countExportRecords, countRecords, exportAllAsJson, ImportError, importReplacingAll, parseExport, toLocalDay, type ExportFile } from '@/data';
import { downloadText } from '@/lib/download';
import styles from './PrivacySettings.module.css';

type Pending = { file: ExportFile; name: string; records: number };
type Message = { tone: 'success' | 'error'; text: string };

const storageRows = [
  { label: 'Goals', tables: ['goals', 'keyResults', 'milestones'] },
  { label: 'Tasks', tables: ['tasks'] },
  { label: 'Habits and logs', tables: ['habits', 'habitLogs'] },
  { label: 'Library pages and photos', tables: ['nodes', 'attachments'] },
  { label: 'Check-ins and reviews', tables: ['dailyEntries', 'reviews'] },
] as const;

export function PrivacySettings() {
  const counts = useLiveQuery(countRecords);
  const totalRecords = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    try {
      downloadText(`life-dashboard-${toLocalDay(new Date())}.json`, await exportAllAsJson());
      setMessage({ tone: 'success', text: 'Export saved to your downloads.' });
    } catch (error) {
      console.error(error);
      setMessage({ tone: 'error', text: 'The export didn’t work. Your data is unchanged; try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still fires
    if (!chosen) return;
    try {
      const file = parseExport(await chosen.text());
      setMessage(null);
      setPending({ file, name: chosen.name, records: countExportRecords(file) });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof ImportError ? error.message : 'That file couldn’t be read.' });
    }
  }

  async function onConfirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      const { records } = await importReplacingAll(pending.file);
      setMessage({ tone: 'success', text: `Imported ${records} records from ${pending.name}.` });
    } catch (error) {
      console.error(error);
      setMessage({ tone: 'error', text: 'The import didn’t finish, so nothing was changed.' });
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  return (
    <div className={styles.grid}>
      <Card title="Storage on this device">
        <p className={styles.lead}>Everything lives here first, so the app works fully offline.</p>
        <dl className={styles.counts}>
          {storageRows.map((row) => (
            <div key={row.label} className={styles.countRow}>
              <dt>{row.label}</dt>
              <dd>{counts ? row.tables.reduce((sum, t) => sum + counts[t], 0) : '…'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Export & import">
        <p className={styles.lead}>Your data is yours. Take all of it, any time, in open formats.</p>
        <div className={styles.rows}>
          <button type="button" className={styles.fileRow} onClick={onExport} disabled={busy}>
            <span className={styles.fileLabel}>Everything, structured</span>
            <span className={styles.fileExt}>.json</span>
          </button>
          <button type="button" className={styles.fileRow} onClick={() => inputRef.current?.click()} disabled={busy}>
            <span className={styles.fileLabel}>Restore from an export</span>
            <span className={styles.fileExt}>.json</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Choose an export file"
            onChange={onFileChosen}
          />
        </div>
        <p className={styles.hint}>Markdown with images, CSV, and imports from other apps come later.</p>
        <div role="status" aria-live="polite" className={message?.tone === 'error' ? styles.error : styles.success}>
          {message?.text}
        </div>
      </Card>

      <Dialog open={!!pending} onClose={() => !busy && setPending(null)} title="Replace everything on this device?">
        {pending && (
          <div className={styles.confirm}>
            <p>
              The {totalRecords} records here will be replaced by the {pending.records} in <strong>{pending.name}</strong>. This
              can’t be undone, so export first if you want a copy of what’s here now.
            </p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setPending(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={onExport} disabled={busy}>
                Export first
              </Button>
              <Button variant="primary" onClick={onConfirmImport} disabled={busy}>
                Replace everything
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
