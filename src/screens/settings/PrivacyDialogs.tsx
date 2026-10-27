import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { passcodeProblem, passphraseProblem } from '@/domain/privacy';
import {
  changePassphrase,
  countExportRecords,
  importReplacingAll,
  newRecoveryKit,
  openBackupFile,
  PrivacyError,
  removePasscode,
  setPasscode,
  setUpEncryption,
  type ExportFile,
} from '@/data';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { rememberLockIsOn, unlock } from '@/components/shell/lock';
import { downloadRecoveryKit } from '@/lib/recoveryKit';
import styles from './PrivacySettings.module.css';

export type PrivacyDialog = 'encryption' | 'passphrase' | 'recovery' | 'passcode' | 'passcode-off' | 'restore' | null;

type Props = { open: PrivacyDialog; onClose: () => void; onMessage: (text: string) => void };

/** Every dialog the Privacy screen opens, desktop and phone. */
export function PrivacyDialogs({ open, onClose, onMessage }: Props) {
  return (
    <>
      <Dialog open={open === 'encryption'} onClose={onClose} title="Encrypt your backups">
        {open === 'encryption' && <EncryptionSetup onDone={onClose} />}
      </Dialog>
      <Dialog open={open === 'passphrase'} onClose={onClose} title="Change backup passphrase">
        {open === 'passphrase' && <ChangePassphrase onDone={onClose} onMessage={onMessage} />}
      </Dialog>
      <Dialog open={open === 'recovery'} onClose={onClose} title="New recovery kit">
        {open === 'recovery' && <NewRecovery onDone={onClose} />}
      </Dialog>
      <Dialog open={open === 'passcode'} onClose={onClose} title="Set a passcode">
        {open === 'passcode' && <SetPasscode onDone={onClose} onMessage={onMessage} />}
      </Dialog>
      <Dialog open={open === 'passcode-off'} onClose={onClose} title="Turn off the app lock">
        {open === 'passcode-off' && <PasscodeOff onDone={onClose} onMessage={onMessage} />}
      </Dialog>
      <Dialog open={open === 'restore'} onClose={onClose} title="Restore from a backup">
        {open === 'restore' && <Restore onDone={onClose} onMessage={onMessage} />}
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return text ? (
    <p className={styles.formError} role="alert">
      {text}
    </p>
  ) : null;
}

const message = (error: unknown) => (error instanceof PrivacyError ? error.message : 'That didn’t work. Nothing was changed; try again.');

function RecoveryKey({ value, onDone }: { value: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className={styles.form}>
      <p>This is your recovery key. It opens your backups if you forget your passphrase. It’s shown once, so save it now.</p>
      <output className={styles.recoveryKey} aria-label="Recovery key">
        {value}
      </output>
      <Button onClick={() => downloadRecoveryKit(value)}>Download recovery kit</Button>
      <label className={styles.check}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I’ve saved my recovery key somewhere safe
      </label>
      <div className={styles.formActions}>
        <Button variant="primary" disabled={!saved} onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

function EncryptionSetup({ onDone }: { onDone: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = passphraseProblem(passphrase);
    if (problem) return setError(problem);
    if (passphrase !== again) return setError('The two passphrases don’t match.');
    setBusy(true);
    try {
      setRecovery(await setUpEncryption(passphrase));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  if (recovery) return <RecoveryKey value={recovery} onDone={onDone} />;
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.lead}>Backups are sealed with this passphrase before they leave the app, so they’re safe in a cloud folder. It never leaves this device.</p>
      <Field label="Passphrase">{(id) => <input id={id} data-autofocus type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />}</Field>
      <Field label="Type it again">{(id) => <input id={id} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />}</Field>
      <p className={styles.warning}>If you lose both your passphrase and your recovery kit, nobody can open your backups. Not even us.</p>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Setting up…' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}

function ChangePassphrase({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await changePassphrase(current, next);
          onMessage('Passphrase changed. New backups use it; older ones open with either.');
          onDone();
        } catch (err) {
          setError(message(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Current passphrase or recovery key">{(id) => <input id={id} data-autofocus type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}</Field>
      <Field label="New passphrase">{(id) => <input id={id} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          Change passphrase
        </Button>
      </div>
    </form>
  );
}

function NewRecovery({ onDone }: { onDone: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState<string | null>(null);
  if (recovery) return <RecoveryKey value={recovery} onDone={onDone} />;
  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          setRecovery(await newRecoveryKit(passphrase));
        } catch (err) {
          setError(message(err));
        }
      }}
    >
      <p className={styles.lead}>A new key replaces the old one for backups made from now on. Backups you already have still open with the old key.</p>
      <Field label="Backup passphrase">{(id) => <input id={id} data-autofocus type="password" autoComplete="current-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Make a new key
        </Button>
      </div>
    </form>
  );
}

function SetPasscode({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const [passcode, setValue] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const problem = passcodeProblem(passcode);
        if (problem) return setError(problem);
        if (passcode !== again) return setError('The two passcodes don’t match.');
        try {
          await setPasscode(passcode);
          rememberLockIsOn(true);
          unlock();
          onMessage('App lock is on. You’ll need the passcode each time the app opens.');
          onDone();
        } catch (err) {
          setError(message(err));
        }
      }}
    >
      <p className={styles.lead}>The lock hides your screen from anyone picking up this device. Your data here isn’t encrypted by it, so keep the device itself locked too.</p>
      <Field label="Passcode">{(id) => <input id={id} data-autofocus type="password" autoComplete="new-password" inputMode="numeric" value={passcode} onChange={(e) => setValue(e.target.value)} />}</Field>
      <Field label="Type it again">{(id) => <input id={id} type="password" autoComplete="new-password" inputMode="numeric" value={again} onChange={(e) => setAgain(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Turn on lock
        </Button>
      </div>
    </form>
  );
}

function PasscodeOff({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await removePasscode(current);
          rememberLockIsOn(false);
          onMessage('App lock is off.');
          onDone();
        } catch (err) {
          setError(message(err));
        }
      }}
    >
      <Field label="Current passcode">{(id) => <input id={id} data-autofocus type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Turn off lock
        </Button>
      </div>
    </form>
  );
}

function Restore({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const [text, setText] = useState<{ name: string; body: string } | null>(null);
  const [secret, setSecret] = useState('');
  const [opened, setOpened] = useState<ExportFile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (opened && text) {
    return (
      <div className={styles.form}>
        <p>
          <strong>{text.name}</strong> holds {countExportRecords(opened)} records. Restoring replaces everything on this device with them. Your lock and backup settings stay as they are.
        </p>
        <ErrorLine text={error} />
        <div className={styles.formActions}>
          <Button onClick={onDone} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { records } = await importReplacingAll(opened);
                onMessage(`Restored ${records} records from ${text.name}.`);
                onDone();
              } catch {
                setError('The restore didn’t finish, so nothing was changed.');
              } finally {
                setBusy(false);
              }
            }}
          >
            Replace everything
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text) return setError('Choose a backup file first.');
        setBusy(true);
        try {
          setOpened(await openBackupFile(text.body, secret));
          setError('');
        } catch (err) {
          setError(message(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Backup file">
        {(id) => (
          <input
            id={id}
            data-autofocus
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setText(file ? { name: file.name, body: await file.text() } : null);
            }}
          />
        )}
      </Field>
      <Field label="Passphrase or recovery key">{(id) => <input id={id} type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Opening…' : 'Open backup'}
        </Button>
      </div>
    </form>
  );
}
