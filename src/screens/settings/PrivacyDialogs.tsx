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
import { messages, useT } from '@/i18n';
import styles from './PrivacySettings.module.css';

export type PrivacyDialog = 'encryption' | 'passphrase' | 'recovery' | 'passcode' | 'passcode-off' | 'restore' | null;

type Props = { open: PrivacyDialog; onClose: () => void; onMessage: (text: string) => void };

/** Every dialog the Privacy screen opens, desktop and phone. */
export function PrivacyDialogs({ open, onClose, onMessage }: Props) {
  const t = useT().privacy.dialogs;
  return (
    <>
      <Dialog open={open === 'encryption'} onClose={onClose} title={t.encryption}>
        {open === 'encryption' && <EncryptionSetup onDone={onClose} />}
      </Dialog>
      <Dialog open={open === 'passphrase'} onClose={onClose} title={t.passphrase}>
        {open === 'passphrase' && <ChangePassphrase onDone={onClose} onMessage={onMessage} />}
      </Dialog>
      <Dialog open={open === 'recovery'} onClose={onClose} title={t.recovery}>
        {open === 'recovery' && <NewRecovery onDone={onClose} />}
      </Dialog>
      <Dialog open={open === 'passcode'} onClose={onClose} title={t.passcode}>
        {open === 'passcode' && <SetPasscode onDone={onClose} onMessage={onMessage} />}
      </Dialog>
      <Dialog open={open === 'passcode-off'} onClose={onClose} title={t.passcodeOff}>
        {open === 'passcode-off' && <PasscodeOff onDone={onClose} onMessage={onMessage} />}
      </Dialog>
      <Dialog open={open === 'restore'} onClose={onClose} title={t.restore}>
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

const message = (error: unknown) => (error instanceof PrivacyError ? error.message : messages().privacy.dialogs.failed);

function RecoveryKey({ value, onDone }: { value: string; onDone: () => void }) {
  const t = useT().privacy.dialogs;
  const [saved, setSaved] = useState(false);
  return (
    <div className={styles.form}>
      <p>{t.keyLead}</p>
      <output className={styles.recoveryKey} aria-label={t.key}>
        {value}
      </output>
      <Button onClick={() => downloadRecoveryKit(value)}>{t.downloadKit}</Button>
      <label className={styles.check}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        {t.savedKey}
      </label>
      <div className={styles.formActions}>
        <Button variant="primary" disabled={!saved} onClick={onDone}>
          {t.done}
        </Button>
      </div>
    </div>
  );
}

function EncryptionSetup({ onDone }: { onDone: () => void }) {
  const t = useT().privacy.dialogs;
  const [passphrase, setPassphrase] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = passphraseProblem(passphrase);
    if (problem) return setError(problem);
    if (passphrase !== again) return setError(t.noMatchPassphrase);
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
      <p className={styles.lead}>{t.sealLead}</p>
      <Field label={t.passphraseLabel}>{(id) => <input id={id} data-autofocus type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />}</Field>
      <Field label={t.again}>{(id) => <input id={id} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />}</Field>
      <p className={styles.warning}>{t.loseBoth}</p>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t.settingUp : t.continue}
        </Button>
      </div>
    </form>
  );
}

function ChangePassphrase({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const t = useT().privacy.dialogs;
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
          onMessage(t.changed);
          onDone();
        } catch (err) {
          setError(message(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label={t.current}>{(id) => <input id={id} data-autofocus type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}</Field>
      <Field label={t.newPassphrase}>{(id) => <input id={id} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {t.change}
        </Button>
      </div>
    </form>
  );
}

function NewRecovery({ onDone }: { onDone: () => void }) {
  const t = useT().privacy.dialogs;
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
      <p className={styles.lead}>{t.newKeyLead}</p>
      <Field label={t.backupPassphrase}>{(id) => <input id={id} data-autofocus type="password" autoComplete="current-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {t.makeKey}
        </Button>
      </div>
    </form>
  );
}

function SetPasscode({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const t = useT().privacy.dialogs;
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
        if (passcode !== again) return setError(t.noMatchPasscode);
        try {
          await setPasscode(passcode);
          rememberLockIsOn(true);
          unlock();
          onMessage(t.lockOn);
          onDone();
        } catch (err) {
          setError(message(err));
        }
      }}
    >
      <p className={styles.lead}>{t.lockLead}</p>
      <Field label={t.passcodeLabel}>{(id) => <input id={id} data-autofocus type="password" autoComplete="new-password" inputMode="numeric" value={passcode} onChange={(e) => setValue(e.target.value)} />}</Field>
      <Field label={t.again}>{(id) => <input id={id} type="password" autoComplete="new-password" inputMode="numeric" value={again} onChange={(e) => setAgain(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {t.turnOn}
        </Button>
      </div>
    </form>
  );
}

function PasscodeOff({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const t = useT().privacy.dialogs;
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
          onMessage(t.lockOff);
          onDone();
        } catch (err) {
          setError(message(err));
        }
      }}
    >
      <Field label={t.currentPasscode}>{(id) => <input id={id} data-autofocus type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">
          {t.turnOff}
        </Button>
      </div>
    </form>
  );
}

function Restore({ onDone, onMessage }: { onDone: () => void; onMessage: (t: string) => void }) {
  const t = useT().privacy.dialogs;
  const [text, setText] = useState<{ name: string; body: string } | null>(null);
  const [secret, setSecret] = useState('');
  const [opened, setOpened] = useState<ExportFile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (opened && text) {
    return (
      <div className={styles.form}>
        <p>
          <strong>{text.name}</strong>
          {t.holds(countExportRecords(opened))}
        </p>
        <ErrorLine text={error} />
        <div className={styles.formActions}>
          <Button onClick={onDone} disabled={busy}>
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { records } = await importReplacingAll(opened);
                onMessage(t.restored(records, text.name));
                onDone();
              } catch {
                setError(t.restoreFailed);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t.replace}
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
        if (!text) return setError(t.chooseBackup);
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
      <Field label={t.backupFile}>
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
      <Field label={t.secret}>{(id) => <input id={id} type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} />}</Field>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t.opening : t.open}
        </Button>
      </div>
    </form>
  );
}
