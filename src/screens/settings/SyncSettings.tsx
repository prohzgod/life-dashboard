import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { accountApi, linkDevice, signOutDevice, syncNow, SyncRequestError, type LinkChoice, type UserAccount } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { Button, Card, Segmented } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { useT } from '@/i18n';
import { timeAgo } from '@/lib/format';
import { useSyncStatus } from '@/lib/useSyncStatus';
import styles from './SyncSettings.module.css';

type Mode = 'signIn' | 'register';
type Pending = { account: UserAccount; ask: 'ask' | 'confirmReplace' };

const deviceName = () => (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || 'Browser';

/** Settings › Account and sync. */
export function SyncSettings() {
  const t = useT().sync;
  const { state, info } = useSyncStatus();
  const [pending, setPending] = useState<Pending | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const signedIn = !!info?.accountId;

  async function link(account: UserAccount, choice?: LinkChoice) {
    const result = await linkDevice(account, choice);
    setPending(result === 'linked' ? null : { account, ask: result });
  }

  async function cancelLink() {
    setPending(null);
    await accountApi.signOut().catch(() => {});
  }

  return (
    <div className={styles.grid}>
      <Card title={t.title}>
        {signedIn ? <SignedIn state={state} email={info.email} lastAt={info.lastAt} unsynced={info.unsynced} onSignOut={() => setSigningOut(true)} /> : <p className={styles.lead}>{t.lead}</p>}
        {(!signedIn || state === 'needsSignIn') && info && <AccountForm defaultEmail={info.email ?? ''} onDone={link} />}
        <p className={styles.truth}>{t.truth}</p>
      </Card>

      <Dialog open={pending?.ask === 'ask'} onClose={() => void cancelLink()} title={t.bothTitle}>
        <p className={styles.dialogLead}>{t.bothLead}</p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => void link(pending!.account, 'combine')}>
            {t.keepBoth}
          </Button>
          <Button onClick={() => void link(pending!.account, 'useAccount')}>{t.useAccount}</Button>
          <Button variant="quiet" onClick={() => void cancelLink()}>
            {t.cancel}
          </Button>
        </div>
      </Dialog>

      <Dialog open={pending?.ask === 'confirmReplace'} onClose={() => void cancelLink()} title={t.otherTitle}>
        <p className={styles.dialogLead}>{t.otherLead}</p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => void link(pending!.account, 'replaceOther')}>
            {t.replace}
          </Button>
          <Button variant="quiet" onClick={() => void cancelLink()}>
            {t.cancel}
          </Button>
        </div>
      </Dialog>

      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </div>
  );
}

function SignedIn({ state, email, lastAt, unsynced, onSignOut }: { state: ReturnType<typeof useSyncStatus>['state']; email: string | null; lastAt: string | null; unsynced: number; onSignOut: () => void }) {
  const t = useT().sync;
  const line =
    state === 'syncing'
      ? t.status.syncing
      : state === 'offline'
        ? t.status.offline
        : state === 'needsSignIn'
          ? t.status.needsSignIn
          : state === 'failed'
            ? t.status.failed
            : lastAt
              ? t.status.synced(timeAgo(lastAt))
              : t.status.syncedSoon;
  return (
    <>
      <div className={styles.account}>
        <span className={styles.accountLabel}>{t.account}</span>
        <span className={styles.accountEmail}>{email}</span>
      </div>
      <p className={styles.status} role="status">
        <span>{line}</span>
        {unsynced > 0 && <span className={styles.unsynced}>{t.unsynced(unsynced)}</span>}
      </p>
      <div className={styles.actions}>
        <Button onClick={() => void syncNow()}>{state === 'failed' ? t.tryAgain : t.syncNow}</Button>
        <Button variant="quiet" onClick={onSignOut}>
          {t.signOut}
        </Button>
      </div>
    </>
  );
}

function AccountForm({ defaultEmail, onDone }: { defaultEmail: string; onDone: (account: UserAccount) => Promise<void> }) {
  const t = useT().sync;
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const account = await (mode === 'signIn' ? accountApi.signIn : accountApi.register)(email, password, deviceName());
      setPassword('');
      await onDone(account);
    } catch (problem) {
      const status = problem instanceof SyncRequestError ? problem.status : 0;
      setError(status === 401 ? t.errors.wrong : status === 409 ? t.errors.taken : status === 400 ? t.errors.invalid : status === 429 ? t.errors.tooMany : t.errors.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={(event) => void submit(event)}>
      <Segmented
        label={t.mode}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'signIn', label: t.signIn },
          { value: 'register', label: t.createAccount },
        ]}
      />
      <label className={styles.field}>
        {t.email}
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className={styles.field}>
        {t.password}
        <input type="password" required autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === 'register' && <span className={styles.hint}>{t.passwordHint}</span>}
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={busy}>
          {mode === 'signIn' ? t.signIn : t.createAccount}
        </Button>
      </div>
    </form>
  );
}

function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT().sync;
  const { info } = useSyncStatus();
  const [warning, setWarning] = useState(false);
  const close = () => {
    setWarning(false);
    onClose();
  };

  async function leave(removeData: boolean, force = false) {
    const result = await signOutDevice({ removeData, force });
    if (result === 'unsynced') setWarning(true);
    else close();
  }

  return (
    <Dialog open={open} onClose={close} title={t.signOutTitle}>
      <p className={styles.dialogLead}>{t.signOutLead}</p>
      {warning && (
        <p className={styles.error} role="alert">
          {t.unsyncedWarning(info?.unsynced ?? 0)}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="primary" onClick={() => void leave(false)}>
          {t.keepData}
        </Button>
        {warning ? (
          <Button onClick={() => void leave(true, true)}>{t.removeAnyway}</Button>
        ) : (
          <Button onClick={() => void leave(true)}>{t.removeData}</Button>
        )}
      </div>
    </Dialog>
  );
}

/** Shows only when sync needs you. Everything else about sync stays out of the way. */
export function SyncNotice() {
  const t = useT().sync;
  const { state } = useSyncStatus();
  if (state !== 'needsSignIn') return null;
  return (
    <Link to="/settings/sync" className={styles.notice}>
      <Icon name="offline" size={16} />
      {t.notice}
    </Link>
  );
}
