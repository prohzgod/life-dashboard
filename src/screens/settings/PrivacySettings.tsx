import { useLiveQuery } from "dexie-react-hooks";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  formatBytes,
  LOCK_AFTER_OPTIONS,
  type LockAfter,
} from "@/domain/privacy";
import {
  backUpToFolder,
  countExportRecords,
  countRecords,
  exportAllAsJson,
  folderAccess,
  getPrivacyState,
  ImportError,
  importReplacingAll,
  keepDataOnDevice,
  makeBackup,
  noteBackup,
  parseExport,
  PrivacyError,
  setBackupFolder,
  setBackupOptions,
  setLockOptions,
  storageUse,
  toLocalDay,
  type ExportFile,
  type PrivacyState,
} from "@/data";
import { lockNow } from "@/components/shell/lock";
import { Button, Card, Switch } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/icons/Icon";
import { biometricAvailable, registerBiometric } from "@/lib/biometric";
import { downloadText } from "@/lib/download";
import { formatDayRelative, formatTime } from "@/lib/format";
import { useIsMobile } from "@/lib/useMediaQuery";
import { useToday } from "@/lib/useToday";
import { PrivacyDialogs, type PrivacyDialog } from "./PrivacyDialogs";
import styles from "./PrivacySettings.module.css";

type Pending = { file: ExportFile; name: string; records: number };
type Message = { tone: "success" | "error"; text: string };

const storageRows = [
  { label: "Goals", tables: ["goals", "keyResults", "milestones"] },
  { label: "Tasks", tables: ["tasks"] },
  { label: "Habits and logs", tables: ["habits", "habitLogs"] },
  { label: "Library pages and photos", tables: ["nodes", "attachments"] },
  { label: "Check-ins and reviews", tables: ["dailyEntries", "reviews"] },
] as const;

const KEEP_OPTIONS = [7, 14, 30, 90];

/** Shown for the moment before settings load, so the screen never flashes empty. */
const LOADING: PrivacyState = {
  lock: {
    passcode: null,
    credentialId: null,
    after: 5,
    blurInSwitcher: true,
    hideMoney: false,
  },
  backup: {
    enabled: false,
    keep: 30,
    folder: null,
    folderName: null,
    lastAt: null,
    lastSize: null,
    lastVerified: false,
    lastError: null,
  },
  encryption: { on: false, since: null },
};

type DirectoryPicker = (options?: {
  mode?: "readwrite";
  id?: string;
}) => Promise<FileSystemDirectoryHandle>;
const pickDirectory = (
  window as unknown as { showDirectoryPicker?: DirectoryPicker }
).showDirectoryPicker;

/** Settings › Privacy & data: storage, sync, backup encryption, the app lock, backups, export. */
export function PrivacySettings() {
  const phone = useIsMobile();
  const today = useToday();
  const state = useLiveQuery(getPrivacyState) ?? LOADING;
  const storage = useLiveQuery(storageUse);
  const counts = useLiveQuery(countRecords);
  const [dialog, setDialog] = useState<PrivacyDialog>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [canBiometric, setCanBiometric] = useState(false);
  const [access, setAccess] = useState<string>("none");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void biometricAvailable().then(setCanBiometric);
  }, []);
  useEffect(() => {
    void folderAccess(state.backup.folder).then(setAccess);
  }, [state.backup.folder]);

  const say = (text: string, tone: Message["tone"] = "success") =>
    setMessage({ tone, text });
  const totalRecords = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0;

  async function onExport() {
    setBusy(true);
    try {
      downloadText(
        `life-dashboard-${toLocalDay(new Date())}.json`,
        await exportAllAsJson(),
      );
      say("Export saved to your downloads.");
    } catch (error) {
      console.error(error);
      say(
        "The export didn’t work. Your data is unchanged; try again.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = ""; // so choosing the same file again still fires
    if (!chosen) return;
    try {
      const file = parseExport(await chosen.text());
      setMessage(null);
      setPending({
        file,
        name: chosen.name,
        records: countExportRecords(file),
      });
    } catch (error) {
      say(
        error instanceof ImportError
          ? error.message
          : "That file couldn’t be read.",
        "error",
      );
    }
  }

  async function onConfirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      const { records } = await importReplacingAll(pending.file);
      say(`Imported ${records} records from ${pending.name}.`);
    } catch (error) {
      console.error(error);
      say("The import didn’t finish, so nothing was changed.", "error");
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  async function backUpNow() {
    if (!state.encryption.on) return setDialog("encryption");
    setBusy(true);
    try {
      if (
        state.backup.folder &&
        (await folderAccess(state.backup.folder, true)) === "granted"
      ) {
        const { name } = await backUpToFolder();
        say(`Backed up to ${state.backup.folderName}: ${name}.`);
      } else {
        const { name, text } = await makeBackup();
        downloadText(name, text);
        await noteBackup(text.length, true);
        say("Encrypted backup saved to your downloads.");
      }
    } catch (error) {
      say(
        error instanceof PrivacyError
          ? error.message
          : "The backup didn’t work. Try again.",
        "error",
      );
    } finally {
      setBusy(false);
      setAccess(await folderAccess(state.backup.folder));
    }
  }

  async function chooseFolder() {
    if (!pickDirectory) return;
    try {
      const folder = await pickDirectory({
        mode: "readwrite",
        id: "life-dashboard-backups",
      });
      await setBackupFolder(folder);
      setAccess(await folderAccess(folder));
      say(`Backups will go to ${folder.name}.`);
    } catch {
      // Closing the picker isn't an error.
    }
  }

  async function setAutomatic(on: boolean) {
    if (on && !state.encryption.on) return setDialog("encryption");
    await setBackupOptions({ enabled: on });
    if (on && !state.backup.folder && pickDirectory) await chooseFolder();
  }

  async function setBiometric(on: boolean) {
    if (!on) return setLockOptions({ credentialId: null });
    if (!state.lock.passcode) return setDialog("passcode");
    try {
      await setLockOptions({ credentialId: await registerBiometric() });
      say("Touch ID or Face ID can now unlock the app on this device.");
    } catch {
      say(
        "Your device didn’t set that up. You can still use your passcode.",
        "error",
      );
    }
  }

  const last = state.backup.lastAt
    ? `${formatDayRelative(toLocalDay(new Date(state.backup.lastAt)), today)} ${formatTime(state.backup.lastAt)}`
    : null;
  const lastLine = last
    ? `${last}${state.backup.lastSize ? `, ${formatBytes(state.backup.lastSize)}` : ""}${state.backup.lastVerified ? ", verified" : ""}`
    : "No backups yet";
  const status = (
    <div
      role="status"
      aria-live="polite"
      className={message?.tone === "error" ? styles.error : styles.success}
    >
      {message?.text}
    </div>
  );
  const shared = (
    <>
      <PrivacyDialogs
        open={dialog}
        onClose={() => setDialog(null)}
        onMessage={(text) => say(text)}
      />
      <Dialog
        open={!!pending}
        onClose={() => !busy && setPending(null)}
        title="Replace everything on this device?"
      >
        {pending && (
          <div className={styles.confirm}>
            <p>
              The {totalRecords} records here will be replaced by the{" "}
              {pending.records} in <strong>{pending.name}</strong>. This can’t
              be undone, so export first if you want a copy of what’s here now.
            </p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setPending(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={onExport} disabled={busy}>
                Export first
              </Button>
              <Button
                variant="primary"
                onClick={onConfirmImport}
                disabled={busy}
              >
                Replace everything
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Choose an export file"
        onChange={onFileChosen}
      />
    </>
  );

  if (phone) {
    return (
      <PhonePrivacy
        state={state}
        storage={storage}
        lastLine={lastLine}
        canBiometric={canBiometric}
        busy={busy}
        onDialog={setDialog}
        onAutomatic={setAutomatic}
        onBiometric={setBiometric}
        onBackUp={backUpNow}
        onExport={onExport}
        status={status}
      >
        {shared}
      </PhonePrivacy>
    );
  }

  return (
    <div className={styles.columns}>
      <div className={styles.column}>
        <Card title="Storage on this device">
          <p className={styles.lead}>
            Everything lives here first, so the app works fully offline.
          </p>
          <StorageBar storage={storage} />
          <dl className={styles.counts}>
            {storageRows.map((row) => (
              <div key={row.label} className={styles.countRow}>
                <dt>{row.label}</dt>
                <dd>
                  {counts
                    ? row.tables.reduce((sum, t) => sum + counts[t], 0)
                    : "…"}
                </dd>
              </div>
            ))}
          </dl>
          <SettingRow
            title="Keep data if space runs low"
            sub={
              storage?.persisted
                ? "The browser won’t clear it to save space"
                : "Browsers may clear sites to free space"
            }
          >
            {(id) => (
              <Switch
                labelledBy={id}
                checked={storage?.persisted ?? false}
                disabled={storage?.persisted}
                onChange={async () =>
                  say(
                    (await keepDataOnDevice())
                      ? "This browser will keep your data."
                      : "This browser didn’t agree. Installing the app usually helps.",
                    "success",
                  )
                }
              />
            )}
          </SettingRow>
        </Card>

        <Card title="Sync between devices">
          <fieldset className={styles.options}>
            <legend className="visually-hidden">Where your data lives</legend>
            <label className={cx(styles.option, styles.optionOn)}>
              <input type="radio" name="sync" defaultChecked />
              <span>
                <strong>This device only</strong>
                <span>No sync at all</span>
              </span>
            </label>
            <label className={cx(styles.option, styles.optionOff)}>
              <input type="radio" name="sync" disabled />
              <span>
                <strong>My devices, end-to-end encrypted</strong>
                <span>Comes with sync</span>
              </span>
            </label>
            <label className={cx(styles.option, styles.optionOff)}>
              <input type="radio" name="sync" disabled />
              <span>
                <strong>My own server</strong>
                <span>Comes with sync</span>
              </span>
            </label>
          </fieldset>
        </Card>
      </div>

      <div className={styles.column}>
        <Card title="Encryption">
          <SettingRow
            title="Encrypted backups"
            sub="Your passphrase never leaves this device"
          >
            {(id) =>
              state.encryption.on ? (
                <span className={styles.onTag} id={id}>
                  On
                </span>
              ) : (
                <Switch
                  labelledBy={id}
                  checked={false}
                  onChange={() => setDialog("encryption")}
                />
              )
            }
          </SettingRow>
          <p className={styles.warning}>
            If you lose both your passphrase and your recovery kit, nobody can
            recover your backups. Not even us.
          </p>
          {state.encryption.on && (
            <div className={styles.buttonRow}>
              <Button onClick={() => setDialog("recovery")}>
                New recovery kit
              </Button>
              <Button onClick={() => setDialog("passphrase")}>
                Change passphrase
              </Button>
            </div>
          )}
          <p className={styles.hint}>
            Data on this device itself isn’t encrypted; keep the device locked
            with its own passcode.
          </p>
        </Card>

        <Card title="App lock & screen privacy">
          <SettingRow
            title="Passcode"
            sub={
              state.lock.passcode
                ? "Needed each time the app opens"
                : "Hide the app behind a passcode"
            }
          >
            {(id) => (
              <Switch
                labelledBy={id}
                checked={Boolean(state.lock.passcode)}
                onChange={(on) => setDialog(on ? "passcode" : "passcode-off")}
              />
            )}
          </SettingRow>
          <SettingRow
            title="Unlock with Touch ID / Face ID"
            sub={canBiometric ? undefined : "Not available in this browser"}
          >
            {(id) => (
              <Switch
                labelledBy={id}
                checked={Boolean(state.lock.credentialId)}
                disabled={!canBiometric || !state.lock.passcode}
                onChange={setBiometric}
              />
            )}
          </SettingRow>
          <LockAfterRow
            value={state.lock.after}
            disabled={!state.lock.passcode}
          />
          <SettingRow
            title="Hide money amounts by default"
            sub="Finance shows •••• until you tap"
          >
            {(id) => (
              <Switch
                labelledBy={id}
                checked={state.lock.hideMoney}
                onChange={(on) => setLockOptions({ hideMoney: on })}
              />
            )}
          </SettingRow>
          <SettingRow title="Blur app in the app switcher">
            {(id) => (
              <Switch
                labelledBy={id}
                checked={state.lock.blurInSwitcher}
                onChange={(on) => setLockOptions({ blurInSwitcher: on })}
              />
            )}
          </SettingRow>
          {state.lock.passcode && (
            <Button icon={<Icon name="lock" size={16} />} onClick={lockNow}>
              Lock app now
            </Button>
          )}
        </Card>
      </div>

      <div className={styles.column}>
        <Card title="Backups">
          <SettingRow title="Automatic encrypted backups">
            {(id) => (
              <Switch
                labelledBy={id}
                checked={state.backup.enabled && state.encryption.on}
                onChange={setAutomatic}
              />
            )}
          </SettingRow>
          <dl className={styles.facts}>
            <div>
              <dt>When</dt>
              <dd>
                {pickDirectory
                  ? "Daily after 03:00, while the app is open"
                  : "Daily reminder to download one"}
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                {state.backup.folderName ??
                  (pickDirectory ? "No folder yet" : "Your downloads")}{" "}
                {pickDirectory && (
                  <button
                    type="button"
                    className={styles.inlineButton}
                    onClick={chooseFolder}
                  >
                    {state.backup.folderName ? "Change" : "Choose a folder"}
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt>
                <label htmlFor="keep-backups">Keep</label>
              </dt>
              <dd>
                <select
                  id="keep-backups"
                  className={styles.inlineSelect}
                  value={state.backup.keep}
                  onChange={(e) =>
                    setBackupOptions({ keep: Number(e.target.value) })
                  }
                >
                  {KEEP_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      Last {n} backups
                    </option>
                  ))}
                </select>
              </dd>
            </div>
            <div>
              <dt>Last</dt>
              <dd className={styles.strong}>{lastLine}</dd>
            </div>
          </dl>
          {access === "prompt" && state.backup.enabled && (
            <p className={styles.notice}>
              Your browser asks again after a restart.{" "}
              <button
                type="button"
                className={styles.inlineButton}
                onClick={async () =>
                  setAccess(await folderAccess(state.backup.folder, true))
                }
              >
                Allow backups to {state.backup.folderName}
              </button>
            </p>
          )}
          {state.backup.lastError && (
            <p className={styles.error}>{state.backup.lastError}</p>
          )}
          <div className={styles.buttonRow}>
            <Button variant="primary" onClick={backUpNow} disabled={busy}>
              Back up now
            </Button>
            <Button onClick={() => setDialog("restore")}>Restore…</Button>
          </div>
        </Card>

        <Card title="Export & import">
          <p className={styles.lead}>
            Your data is yours. Take all of it, any time, in open formats.
          </p>
          <div className={styles.rows}>
            <button
              type="button"
              className={styles.fileRow}
              onClick={onExport}
              disabled={busy}
            >
              <span className={styles.fileLabel}>Everything, structured</span>
              <span className={styles.fileExt}>.json</span>
            </button>
            <button
              type="button"
              className={styles.fileRow}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <span className={styles.fileLabel}>Restore from an export</span>
              <span className={styles.fileExt}>.json</span>
            </button>
          </div>
          <p className={styles.hint}>
            Markdown with images, CSV, and imports from other apps come later.
          </p>
          {status}
        </Card>
      </div>
      {shared}
    </div>
  );
}

function SettingRow({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: (labelId: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={styles.setting}>
      <span className={styles.settingText}>
        <span id={id} className={styles.settingTitle}>
          {title}
        </span>
        {sub && <span className={styles.settingSub}>{sub}</span>}
      </span>
      {children(id)}
    </div>
  );
}

function LockAfterRow({
  value,
  disabled,
}: {
  value: LockAfter;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.setting}>
      <label htmlFor={id} className={styles.settingTitle}>
        Lock after
      </label>
      <select
        id={id}
        className={styles.select}
        disabled={disabled}
        value={value === null ? "never" : String(value)}
        onChange={(e) =>
          setLockOptions({
            after:
              e.target.value === "never"
                ? null
                : (Number(e.target.value) as LockAfter),
          })
        }
      >
        {LOCK_AFTER_OPTIONS.map((o) => (
          <option
            key={o.label}
            value={o.value === null ? "never" : String(o.value)}
          >
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StorageBar({
  storage,
  compact = false,
}: {
  storage: Awaited<ReturnType<typeof storageUse>> | undefined;
  compact?: boolean;
}) {
  if (!storage) return null;
  const total = Math.max(storage.used ?? 0, storage.images + storage.files);
  const database = Math.max(0, total - storage.images - storage.files);
  const quota =
    storage.quota && storage.quota > total
      ? Math.min(storage.quota, total * 4 || 1)
      : total || 1;
  const parts = [
    { label: "Database", bytes: database, className: styles.partDatabase },
    { label: "Images", bytes: storage.images, className: styles.partImages },
    { label: "Attachments", bytes: storage.files, className: styles.partFiles },
  ];
  return (
    <div className={styles.storage}>
      <div
        className={styles.bar}
        role="img"
        aria-label={`${formatBytes(total)} used on this device`}
      >
        {parts.map((p) => (
          <span
            key={p.label}
            className={p.className}
            style={{ width: `${(p.bytes / quota) * 100}%` }}
          />
        ))}
      </div>
      {compact ? (
        <p className={styles.settingSub}>
          Works fully offline. Database {formatBytes(database)}, photos{" "}
          {formatBytes(storage.images)}
        </p>
      ) : (
        <ul className={styles.legend}>
          {parts.map((p) => (
            <li key={p.label}>
              <span
                className={cx(styles.swatch, p.className)}
                aria-hidden="true"
              />
              {p.label}, {formatBytes(p.bytes)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PhoneProps = {
  state: PrivacyState;
  storage: Awaited<ReturnType<typeof storageUse>> | undefined;
  lastLine: string;
  canBiometric: boolean;
  busy: boolean;
  onDialog: (d: PrivacyDialog) => void;
  onAutomatic: (on: boolean) => void;
  onBiometric: (on: boolean) => void;
  onBackUp: () => void;
  onExport: () => void;
  status: ReactNode;
  children: ReactNode;
};

/** Phones: the design's grouped list. */
function PhonePrivacy({
  state,
  storage,
  lastLine,
  canBiometric,
  busy,
  onDialog,
  onAutomatic,
  onBiometric,
  onBackUp,
  onExport,
  status,
  children,
}: PhoneProps) {
  const total = storage
    ? Math.max(storage.used ?? 0, storage.images + storage.files)
    : 0;
  const after =
    LOCK_AFTER_OPTIONS.find((o) => o.value === state.lock.after)?.label.replace(
      " away",
      "",
    ) ?? "";
  return (
    <div className={styles.phone}>
      <section className={styles.group} aria-label="On this phone">
        <div className={styles.phoneStorage}>
          <div className={styles.phoneStorageHead}>
            <strong>On this phone</strong>
            <span>{formatBytes(total)}</span>
          </div>
          <StorageBar storage={storage} compact />
        </div>
      </section>

      <h2 className={styles.groupLabel}>Sync</h2>
      <section className={styles.group}>
        <PhoneRow title="My devices" sub="Sync comes later">
          <span className={styles.rowValue}>This one only</span>
        </PhoneRow>
      </section>

      <h2 className={styles.groupLabel}>Security</h2>
      <section className={styles.group}>
        <PhoneRow
          title="Encrypted backups"
          sub={
            state.encryption.on
              ? "Passphrase set"
              : "Seal backups with a passphrase"
          }
        >
          {(id) =>
            state.encryption.on ? (
              <button
                type="button"
                className={styles.rowLink}
                onClick={() => onDialog("passphrase")}
                aria-describedby={id}
              >
                Change
              </button>
            ) : (
              <Switch
                labelledBy={id}
                checked={false}
                onChange={() => onDialog("encryption")}
              />
            )
          }
        </PhoneRow>
        <PhoneRow
          title="Passcode lock"
          sub={
            state.lock.passcode
              ? state.lock.after === null
                ? "Locks when you lock it"
                : `Lock after ${after}`
              : "Off"
          }
        >
          {(id) => (
            <Switch
              labelledBy={id}
              checked={Boolean(state.lock.passcode)}
              onChange={(on) => onDialog(on ? "passcode" : "passcode-off")}
            />
          )}
        </PhoneRow>
        {canBiometric && (
          <PhoneRow title="Face ID unlock">
            {(id) => (
              <Switch
                labelledBy={id}
                checked={Boolean(state.lock.credentialId)}
                disabled={!state.lock.passcode}
                onChange={onBiometric}
              />
            )}
          </PhoneRow>
        )}
        {state.lock.passcode && (
          <LockAfterRow value={state.lock.after} disabled={false} />
        )}
        {state.encryption.on && (
          <PhoneRow
            title="Recovery kit"
            sub="Needed if you forget your passphrase"
          >
            {(id) => (
              <button
                type="button"
                className={styles.rowLink}
                onClick={() => onDialog("recovery")}
                aria-describedby={id}
              >
                New kit
              </button>
            )}
          </PhoneRow>
        )}
      </section>

      <h2 className={styles.groupLabel}>Backup & export</h2>
      <section className={styles.group}>
        <PhoneRow title="Daily backup" sub={lastLine}>
          {(id) => (
            <Switch
              labelledBy={id}
              checked={state.backup.enabled && state.encryption.on}
              onChange={onAutomatic}
            />
          )}
        </PhoneRow>
        <PhoneButton
          title="Back up now"
          sub="An encrypted file to your downloads"
          onClick={onBackUp}
          disabled={busy}
        />
        <PhoneButton
          title="Restore from a backup"
          onClick={() => onDialog("restore")}
        />
        <PhoneButton
          title="Export everything"
          sub="JSON, readable anywhere"
          onClick={onExport}
          disabled={busy}
        />
      </section>
      {state.lock.passcode && (
        <Button icon={<Icon name="lock" size={16} />} onClick={lockNow}>
          Lock app now
        </Button>
      )}
      {status}
      {children}
    </div>
  );
}

function PhoneRow({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode | ((labelId: string) => ReactNode);
}) {
  const id = useId();
  return (
    <div className={styles.phoneRow}>
      <span className={styles.settingText}>
        <span id={id} className={styles.phoneRowTitle}>
          {title}
        </span>
        {sub && <span className={styles.settingSub}>{sub}</span>}
      </span>
      {typeof children === "function" ? children(id) : children}
    </div>
  );
}

function PhoneButton({
  title,
  sub,
  onClick,
  disabled,
}: {
  title: string;
  sub?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.phoneRowButton}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.settingText}>
        <span className={styles.phoneRowTitle}>{title}</span>
        {sub && <span className={styles.settingSub}>{sub}</span>}
      </span>
      <Icon name="chevronRight" size={16} />
    </button>
  );
}
