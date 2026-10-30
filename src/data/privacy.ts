import { messages } from '@/i18n/locale';
import { backupDue, backupFileName, backupsToPrune, passcodeProblem, passphraseProblem, type LockAfter } from '@/domain/privacy';
import {
  checkPasscode,
  CryptoError,
  decryptWith,
  hashPasscode,
  newDataKey,
  newRecoveryKey,
  normalizeRecoveryKey,
  openBackup,
  parseBackup,
  sealBackup,
  unwrapDataKey,
  wrapDataKey,
  type BackupKeys,
  type PasscodeHash,
} from '@/lib/crypto';
import { exportAllAsJson, parseExport, type ExportFile } from './backup';
import { db } from './db';
import { nowIso } from './ids';
import { attachmentsRepo } from './repositories';

/**
 * Privacy settings belong to this device, not to your data: they live in `meta`, so an export
 * never carries them and restoring a backup never replaces them.
 */

export class PrivacyError extends Error {}

export type LockSettings = {
  passcode: PasscodeHash | null;
  /** WebAuthn credential for Touch ID / Face ID / Windows Hello, base64. */
  credentialId: string | null;
  after: LockAfter;
  blurInSwitcher: boolean;
  hideMoney: boolean;
};

export type BackupSettings = {
  enabled: boolean;
  keep: number;
  /** A folder picked with the File System Access API; null means backups download instead. */
  folder: FileSystemDirectoryHandle | null;
  folderName: string | null;
  lastAt: string | null;
  lastSize: number | null;
  lastVerified: boolean;
  lastError: string | null;
};

type EncryptionRecord = { keys: BackupKeys; dataKey: CryptoKey; createdAt: string };

const LOCK_KEY = 'privacy.lock';
const BACKUP_KEY = 'privacy.backup';
const ENCRYPTION_KEY = 'privacy.encryption';

const DEFAULT_LOCK: LockSettings = { passcode: null, credentialId: null, after: 5, blurInSwitcher: true, hideMoney: false };
const DEFAULT_BACKUP: BackupSettings = { enabled: false, keep: 30, folder: null, folderName: null, lastAt: null, lastSize: null, lastVerified: false, lastError: null };

async function read<T>(key: string, fallback: T): Promise<T> {
  const entry = await db.meta.get(key);
  return entry ? { ...fallback, ...(entry.value as T) } : fallback;
}

async function write<T extends object>(key: string, fallback: T, patch: Partial<T>): Promise<T> {
  return db.transaction('rw', db.meta, async () => {
    const next = { ...(await read(key, fallback)), ...patch };
    await db.meta.put({ key, value: next });
    return next;
  });
}

export type PrivacyState = { lock: LockSettings; backup: BackupSettings; encryption: { on: boolean; since: string | null } };

/** Everything the Privacy screen shows. Read-only, so it's safe in a live query. */
export async function getPrivacyState(): Promise<PrivacyState> {
  const [lock, backup, encryption] = await Promise.all([read(LOCK_KEY, DEFAULT_LOCK), read(BACKUP_KEY, DEFAULT_BACKUP), db.meta.get(ENCRYPTION_KEY)]);
  const record = encryption?.value as EncryptionRecord | undefined;
  return { lock, backup, encryption: { on: Boolean(record), since: record?.createdAt ?? null } };
}

// ---- App lock ----

export async function setPasscode(passcode: string, iterations?: number): Promise<void> {
  const problem = passcodeProblem(passcode);
  if (problem) throw new PrivacyError(problem);
  await write(LOCK_KEY, DEFAULT_LOCK, { passcode: await hashPasscode(passcode, iterations) });
}

/** Turning the lock off needs the current passcode, so someone at an unlocked screen can't quietly remove it. */
export async function removePasscode(current: string): Promise<void> {
  const { passcode } = await read(LOCK_KEY, DEFAULT_LOCK);
  if (passcode && !(await checkPasscode(current, passcode))) throw new PrivacyError(messages().errors.privacy.passcode);
  await write(LOCK_KEY, DEFAULT_LOCK, { passcode: null, credentialId: null });
}

export async function checkUnlock(passcode: string): Promise<boolean> {
  const { passcode: stored } = await read(LOCK_KEY, DEFAULT_LOCK);
  return stored ? checkPasscode(passcode, stored) : true;
}

export async function setLockOptions(patch: Partial<Pick<LockSettings, 'after' | 'blurInSwitcher' | 'hideMoney' | 'credentialId'>>): Promise<void> {
  await write(LOCK_KEY, DEFAULT_LOCK, patch);
}

// ---- Encryption for backups ----

/** Sets up encrypted backups and returns the recovery key, shown once for you to keep. */
export async function setUpEncryption(passphrase: string, iterations?: number): Promise<string> {
  const problem = passphraseProblem(passphrase);
  if (problem) throw new PrivacyError(problem);
  const dataKey = await newDataKey();
  const recovery = newRecoveryKey();
  const keys = { passphrase: await wrapDataKey(dataKey, passphrase, iterations), recovery: await wrapDataKey(dataKey, recovery, iterations) };
  await db.meta.put({ key: ENCRYPTION_KEY, value: { keys, dataKey, createdAt: nowIso() } satisfies EncryptionRecord });
  return recovery;
}

/** New passphrase, proven with the old one or the recovery key. Old backups open with the new one too. */
export async function changePassphrase(current: string, next: string, iterations?: number): Promise<void> {
  const record = await encryption();
  const problem = passphraseProblem(next);
  if (problem) throw new PrivacyError(problem);
  const recovery = normalizeRecoveryKey(current);
  const dataKey = await (recovery ? unwrapDataKey(record.keys.recovery, recovery) : unwrapDataKey(record.keys.passphrase, current)).catch(() => {
    throw new PrivacyError(messages().errors.privacy.current);
  });
  await db.meta.put({ key: ENCRYPTION_KEY, value: { ...record, keys: { ...record.keys, passphrase: await wrapDataKey(dataKey, next, iterations) } } });
}

/** A new recovery key (the old one stops working for future backups). Needs the passphrase. */
export async function newRecoveryKit(passphrase: string, iterations?: number): Promise<string> {
  const record = await encryption();
  const dataKey = await unwrapDataKey(record.keys.passphrase, passphrase).catch(() => {
    throw new PrivacyError(messages().errors.privacy.passphrase);
  });
  const recovery = newRecoveryKey();
  await db.meta.put({ key: ENCRYPTION_KEY, value: { ...record, keys: { ...record.keys, recovery: await wrapDataKey(dataKey, recovery, iterations) } } });
  return recovery;
}

async function encryption(): Promise<EncryptionRecord> {
  const entry = await db.meta.get(ENCRYPTION_KEY);
  if (!entry) throw new PrivacyError(messages().errors.privacy.setPassphrase);
  return entry.value as EncryptionRecord;
}

// ---- Backups ----

export async function setBackupOptions(patch: Partial<Pick<BackupSettings, 'enabled' | 'keep'>>): Promise<void> {
  await write(BACKUP_KEY, DEFAULT_BACKUP, patch);
}

export async function setBackupFolder(folder: FileSystemDirectoryHandle | null): Promise<void> {
  await write(BACKUP_KEY, DEFAULT_BACKUP, { folder, folderName: folder?.name ?? null, lastError: null });
}

/** Seals everything on this device into an encrypted backup, and checks it opens again before calling it good. */
export async function makeBackup(now = new Date()): Promise<{ name: string; text: string }> {
  const record = await encryption();
  const json = await exportAllAsJson();
  const text = await sealBackup(record.dataKey, record.keys, json, now.toISOString());
  parseExport(await decryptWith(record.dataKey, parseBackup(text)));
  return { name: backupFileName(now), text };
}

/** Records a finished backup (for one saved through a download, which can't be read back). */
export async function noteBackup(size: number, verified: boolean, at = nowIso()): Promise<void> {
  await write(BACKUP_KEY, DEFAULT_BACKUP, { lastAt: at, lastSize: size, lastVerified: verified, lastError: null });
}

export type FolderAccess = 'granted' | 'prompt' | 'denied' | 'none';

/** Whether the app may write to the backup folder now. Browsers ask again after a restart. */
export async function folderAccess(folder: FileSystemDirectoryHandle | null, ask = false): Promise<FolderAccess> {
  if (!folder) return 'none';
  const handle = folder as FileSystemDirectoryHandle & {
    queryPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>;
  };
  const state = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
  if (state === 'granted' || !ask) return state;
  return (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'denied';
}

/** Writes a backup into the folder, reads it back to check it, then keeps only the newest `keep`. */
export async function backUpToFolder(now = new Date()): Promise<{ name: string; size: number }> {
  const settings = await read(BACKUP_KEY, DEFAULT_BACKUP);
  if (!settings.folder) throw new PrivacyError(messages().errors.privacy.chooseFolder);
  try {
    const { name, text } = await makeBackup(now);
    const file = await settings.folder.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(text);
    await writable.close();
    const written = await (await file.getFile()).text();
    const verified = written === text;
    const names: string[] = [];
    for await (const entry of (settings.folder as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) if (entry.kind === 'file') names.push(entry.name);
    for (const old of backupsToPrune(names, settings.keep)) await settings.folder.removeEntry(old);
    await noteBackup(text.length, verified, now.toISOString());
    return { name, size: text.length };
  } catch (error) {
    const message = error instanceof PrivacyError || error instanceof CryptoError ? error.message : messages().errors.privacy.writeFailed;
    await write(BACKUP_KEY, DEFAULT_BACKUP, { lastError: message });
    throw new PrivacyError(message);
  }
}

/** Runs the daily backup when it's due and the folder is writable without asking. Quiet otherwise. */
export async function runAutomaticBackup(now = new Date()): Promise<'done' | 'not-due' | 'needs-access' | 'off'> {
  const { backup, encryption: enc } = await getPrivacyState();
  if (!backup.enabled || !enc.on || !backup.folder) return 'off';
  if (!backupDue(backup.lastAt, now)) return 'not-due';
  if ((await folderAccess(backup.folder)) !== 'granted') return 'needs-access';
  await backUpToFolder(now).catch(() => undefined);
  return 'done';
}

/** Opens a backup file with your passphrase or recovery key, ready to restore. */
export async function openBackupFile(text: string, secret: string): Promise<ExportFile> {
  try {
    return parseExport(await openBackup(parseBackup(text), secret));
  } catch (error) {
    if (error instanceof CryptoError) throw new PrivacyError(error.message);
    throw error;
  }
}

// ---- Storage ----

export type StorageUse = { used: number | null; quota: number | null; images: number; files: number; persisted: boolean };

/** How much this device holds: the browser's estimate, split into pictures and other files. */
export async function storageUse(): Promise<StorageUse> {
  const [estimate, attachments, persisted] = await Promise.all([
    navigator.storage?.estimate?.().catch(() => null) ?? null,
    attachmentsRepo.list(),
    navigator.storage?.persisted?.().catch(() => false) ?? false,
  ]);
  let images = 0;
  let files = 0;
  for (const a of attachments) {
    const size = a.size + (a.thumbBlob?.size ?? 0);
    if (a.mime.startsWith('image/')) images += size;
    else files += size;
  }
  return { used: estimate?.usage ?? null, quota: estimate?.quota ?? null, images, files, persisted };
}

/** Asks the browser to keep this data even when the device is low on space. */
export async function keepDataOnDevice(): Promise<boolean> {
  return (await navigator.storage?.persist?.().catch(() => false)) ?? false;
}
