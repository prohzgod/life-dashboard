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
  LOCK_AFTER_VALUES,
  lockAfterLabel,
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
import { useT } from "@/i18n";
import styles from "./PrivacySettings.module.css";

type Pending = { file: ExportFile; name: string; records: number };
type Message = { tone: "success" | "error"; text: string };

const storageRows = [
  { key: "goals", tables: ["goals", "keyResults", "milestones"] },
  { key: "tasks", tables: ["tasks"] },
  { key: "habits", tables: ["habits", "habitLogs"] },
  { key: "library", tables: ["nodes", "attachments"] },
  { key: "checkIns", tables: ["dailyEntries", "reviews"] },
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
  const t = useT().privacy;
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
      say(t.exported);
    } catch (error) {
      console.error(error);
      say(t.exportFailed, "error");
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
        error instanceof ImportError ? error.message : t.unreadable,
        "error",
      );
    }
  }

  async function onConfirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      const { records } = await importReplacingAll(pending.file);
      say(t.imported(records, pending.name));
    } catch (error) {
      console.error(error);
      say(t.importFailed, "error");
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
        say(t.backedUpTo(state.backup.folderName ?? '', name));
      } else {
        const { name, text } = await makeBackup();
        downloadText(name, text);
        await noteBackup(text.length, true);
        say(t.backedUp);
      }
    } catch (error) {
      say(
        error instanceof PrivacyError ? error.message : t.backupFailed,
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
      say(t.folderSet(folder.name));
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
      say(t.biometricOn);
    } catch {
      say(t.biometricFailed, "error");
    }
  }

  const last = state.backup.lastAt
    ? `${formatDayRelative(toLocalDay(new Date(state.backup.lastAt)), today)} ${formatTime(state.backup.lastAt)}`
    : null;
  const lastLine = last
    ? `${last}${state.backup.lastSize ? `, ${formatBytes(state.backup.lastSize)}` : ""}${state.backup.lastVerified ? t.verified : ""}`
    : t.noBackups;
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
        title={t.replaceTitle}
      >
        {pending && (
          <div className={styles.confirm}>
            <p>
              {t.replaceBody(totalRecords, pending.records)}{" "}
              <strong>{pending.name}</strong>
              {t.replaceAfter}
            </p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setPending(null)} disabled={busy}>
                {t.cancel}
              </Button>
              <Button onClick={onExport} disabled={busy}>
                {t.exportFirst}
              </Button>
              <Button
                variant="primary"
                onClick={onConfirmImport}
                disabled={busy}
              >
                {t.replace}
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
        aria-label={t.chooseExport}
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
        <Card title={t.storage}>
          <p className={styles.lead}>{t.storageLead}</p>
          <StorageBar storage={storage} />
          <dl className={styles.counts}>
            {storageRows.map((row) => (
              <div key={row.key} className={styles.countRow}>
                <dt>{t.rows[row.key]}</dt>
                <dd>
                  {counts
                    ? row.tables.reduce((sum, table) => sum + counts[table], 0)
                    : "…"}
                </dd>
              </div>
            ))}
          </dl>
          <SettingRow
            title={t.keepData}
            sub={storage?.persisted ? t.persisted : t.mayClear}
          >
            {(id) => (
              <Switch
                labelledBy={id}
                checked={storage?.persisted ?? false}
                disabled={storage?.persisted}
                onChange={async () =>
                  say(
                    (await keepDataOnDevice()) ? t.kept : t.notKept,
                    "success",
                  )
                }
              />
            )}
          </SettingRow>
        </Card>

        <Card title={t.sync}>
          <fieldset className={styles.options}>
            <legend className="visually-hidden">{t.whereLives}</legend>
            <label className={cx(styles.option, styles.optionOn)}>
              <input type="radio" name="sync" defaultChecked />
              <span>
                <strong>{t.deviceOnly}</strong>
                <span>{t.noSync}</span>
              </span>
            </label>
            <label className={cx(styles.option, styles.optionOff)}>
              <input type="radio" name="sync" disabled />
              <span>
                <strong>{t.myDevices}</strong>
                <span>{t.comesWithSync}</span>
              </span>
            </label>
            <label className={cx(styles.option, styles.optionOff)}>
              <input type="radio" name="sync" disabled />
              <span>
                <strong>{t.ownServer}</strong>
                <span>{t.comesWithSync}</span>
              </span>
            </label>
          </fieldset>
        </Card>
      </div>

      <div className={styles.column}>
        <Card title={t.encryption}>
          <SettingRow title={t.encryptedBackups} sub={t.passphraseStays}>
            {(id) =>
              state.encryption.on ? (
                <span className={styles.onTag} id={id}>
                  {t.on}
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
          <p className={styles.warning}>{t.loseBoth}</p>
          {state.encryption.on && (
            <div className={styles.buttonRow}>
              <Button onClick={() => setDialog("recovery")}>{t.newKit}</Button>
              <Button onClick={() => setDialog("passphrase")}>
                {t.changePassphrase}
              </Button>
            </div>
          )}
          <p className={styles.hint}>{t.deviceNotEncrypted}</p>
        </Card>

        <Card title={t.lock}>
          <SettingRow
            title={t.passcode}
            sub={state.lock.passcode ? t.passcodeOn : t.passcodeOff}
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
            title={t.biometric}
            sub={canBiometric ? undefined : t.noBiometric}
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
          <SettingRow title={t.hideMoney} sub={t.hideMoneySub}>
            {(id) => (
              <Switch
                labelledBy={id}
                checked={state.lock.hideMoney}
                onChange={(on) => setLockOptions({ hideMoney: on })}
              />
            )}
          </SettingRow>
          <SettingRow title={t.blur}>
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
              {t.lockNow}
            </Button>
          )}
        </Card>
      </div>

      <div className={styles.column}>
        <Card title={t.backups}>
          <SettingRow title={t.automatic}>
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
              <dt>{t.when}</dt>
              <dd>{pickDirectory ? t.daily : t.dailyReminder}</dd>
            </div>
            <div>
              <dt>{t.where}</dt>
              <dd>
                {state.backup.folderName ??
                  (pickDirectory ? t.noFolder : t.downloads)}{" "}
                {pickDirectory && (
                  <button
                    type="button"
                    className={styles.inlineButton}
                    onClick={chooseFolder}
                  >
                    {state.backup.folderName ? t.change : t.chooseFolder}
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt>
                <label htmlFor="keep-backups">{t.keep}</label>
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
                      {t.lastN(n)}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
            <div>
              <dt>{t.last}</dt>
              <dd className={styles.strong}>{lastLine}</dd>
            </div>
          </dl>
          {access === "prompt" && state.backup.enabled && (
            <p className={styles.notice}>
              {t.asksAgain}{" "}
              <button
                type="button"
                className={styles.inlineButton}
                onClick={async () =>
                  setAccess(await folderAccess(state.backup.folder, true))
                }
              >
                {t.allow(state.backup.folderName)}
              </button>
            </p>
          )}
          {state.backup.lastError && (
            <p className={styles.error}>{state.backup.lastError}</p>
          )}
          <div className={styles.buttonRow}>
            <Button variant="primary" onClick={backUpNow} disabled={busy}>
              {t.backUpNow}
            </Button>
            <Button onClick={() => setDialog("restore")}>{t.restore}</Button>
          </div>
        </Card>

        <Card title={t.export}>
          <p className={styles.lead}>{t.exportLead}</p>
          <div className={styles.rows}>
            <button
              type="button"
              className={styles.fileRow}
              onClick={onExport}
              disabled={busy}
            >
              <span className={styles.fileLabel}>{t.structured}</span>
              <span className={styles.fileExt}>.json</span>
            </button>
            <button
              type="button"
              className={styles.fileRow}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <span className={styles.fileLabel}>{t.restoreExport}</span>
              <span className={styles.fileExt}>.json</span>
            </button>
          </div>
          <p className={styles.hint}>{t.later}</p>
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
  const t = useT().privacy;
  const id = useId();
  return (
    <div className={styles.setting}>
      <label htmlFor={id} className={styles.settingTitle}>
        {t.lockAfterLabel}
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
        {LOCK_AFTER_VALUES.map((v) => (
          <option key={String(v)} value={v === null ? "never" : String(v)}>
            {lockAfterLabel(v)}
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
  const t = useT().privacy;
  if (!storage) return null;
  const total = Math.max(storage.used ?? 0, storage.images + storage.files);
  const database = Math.max(0, total - storage.images - storage.files);
  const quota =
    storage.quota && storage.quota > total
      ? Math.min(storage.quota, total * 4 || 1)
      : total || 1;
  const parts = [
    { label: t.parts.database, bytes: database, className: styles.partDatabase },
    { label: t.parts.images, bytes: storage.images, className: styles.partImages },
    { label: t.parts.files, bytes: storage.files, className: styles.partFiles },
  ];
  return (
    <div className={styles.storage}>
      <div
        className={styles.bar}
        role="img"
        aria-label={t.used(formatBytes(total))}
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
          {t.compact(formatBytes(database), formatBytes(storage.images))}
        </p>
      ) : (
        <ul className={styles.legend}>
          {parts.map((p) => (
            <li key={p.label}>
              <span
                className={cx(styles.swatch, p.className)}
                aria-hidden="true"
              />
              {t.part(p.label, formatBytes(p.bytes))}
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
  const all = useT().privacy;
  const t = all.phone;
  const total = storage
    ? Math.max(storage.used ?? 0, storage.images + storage.files)
    : 0;
  const after = lockAfterLabel(state.lock.after, true);
  return (
    <div className={styles.phone}>
      <section className={styles.group} aria-label={t.onPhone}>
        <div className={styles.phoneStorage}>
          <div className={styles.phoneStorageHead}>
            <strong>{t.onPhone}</strong>
            <span>{formatBytes(total)}</span>
          </div>
          <StorageBar storage={storage} compact />
        </div>
      </section>

      <h2 className={styles.groupLabel}>{t.sync}</h2>
      <section className={styles.group}>
        <PhoneRow title={t.myDevices} sub={t.later}>
          <span className={styles.rowValue}>{t.thisOne}</span>
        </PhoneRow>
      </section>

      <h2 className={styles.groupLabel}>{t.security}</h2>
      <section className={styles.group}>
        <PhoneRow
          title={all.encryptedBackups}
          sub={state.encryption.on ? t.passphraseSet : t.seal}
        >
          {(id) =>
            state.encryption.on ? (
              <button
                type="button"
                className={styles.rowLink}
                onClick={() => onDialog("passphrase")}
                aria-describedby={id}
              >
                {t.change}
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
          title={t.passcodeLock}
          sub={
            state.lock.passcode
              ? state.lock.after === null
                ? t.whenYouLock
                : t.lockAfter(after)
              : t.off
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
          <PhoneRow title={t.faceId}>
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
          <PhoneRow title={t.recovery} sub={t.recoverySub}>
            {(id) => (
              <button
                type="button"
                className={styles.rowLink}
                onClick={() => onDialog("recovery")}
                aria-describedby={id}
              >
                {t.newKit}
              </button>
            )}
          </PhoneRow>
        )}
      </section>

      <h2 className={styles.groupLabel}>{t.backup}</h2>
      <section className={styles.group}>
        <PhoneRow title={t.daily} sub={lastLine}>
          {(id) => (
            <Switch
              labelledBy={id}
              checked={state.backup.enabled && state.encryption.on}
              onChange={onAutomatic}
            />
          )}
        </PhoneRow>
        <PhoneButton
          title={t.backUpNow}
          sub={t.backUpSub}
          onClick={onBackUp}
          disabled={busy}
        />
        <PhoneButton
          title={t.restore}
          onClick={() => onDialog("restore")}
        />
        <PhoneButton
          title={t.exportAll}
          sub={t.exportSub}
          onClick={onExport}
          disabled={busy}
        />
      </section>
      {state.lock.passcode && (
        <Button icon={<Icon name="lock" size={16} />} onClick={lockNow}>
          {all.lockNow}
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
