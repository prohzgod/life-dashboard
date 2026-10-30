/**
 * Encryption for backups, on this device, with the browser's Web Crypto.
 *
 * Each backup is sealed with a random data key (AES-GCM 256). That key is itself wrapped twice:
 * once with a key derived from your passphrase (PBKDF2-SHA-256) and once with one derived from
 * your recovery key, so either one opens any backup. Neither ever leaves the device.
 */

import { messages } from '@/i18n/locale';

export const BACKUP_FORMAT = 'life-dashboard-backup';
export const BACKUP_VERSION = 1;
export const KDF_ITERATIONS = 310_000;

export class CryptoError extends Error {}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text = '';
  for (let i = 0; i < view.length; i += 0x8000) text += String.fromCharCode(...view.subarray(i, i + 0x8000));
  return btoa(text);
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(text);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** A fresh key for sealing backups. Extractable, so it can be wrapped again when the passphrase changes. */
export function newDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

// ---- Recovery key ----

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** 160 random bits as 32 letters and digits in groups of four: "K7QF-2MXA-…". */
export function newRecoveryKey(): string {
  const bytes = random(20);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return out.match(/.{4}/g)!.join('-');
}

/** Accepts a recovery key typed loosely: any case, spaces or dashes, and 0/1/8 for O/I/B. */
export function normalizeRecoveryKey(text: string): string | null {
  const clean = text
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B');
  if (clean.length !== 32 || [...clean].some((c) => !BASE32.includes(c))) return null;
  return clean.match(/.{4}/g)!.join('-');
}

// ---- Wrapping the data key ----

export type KeyEnvelope = { salt: string; iterations: number; iv: string; wrapped: string };

async function keyFromSecret(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(secret.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
}

export async function wrapDataKey(dataKey: CryptoKey, secret: string, iterations = KDF_ITERATIONS): Promise<KeyEnvelope> {
  const salt = random(16);
  const iv = random(12);
  const kek = await keyFromSecret(secret, salt, iterations);
  const wrapped = await crypto.subtle.wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv });
  return { salt: toBase64(salt), iterations, iv: toBase64(iv), wrapped: toBase64(wrapped) };
}

/** Opens a wrapped data key; throws a CryptoError when the secret is wrong. */
export async function unwrapDataKey(envelope: KeyEnvelope, secret: string): Promise<CryptoKey> {
  const kek = await keyFromSecret(secret, fromBase64(envelope.salt), envelope.iterations);
  try {
    return await crypto.subtle.unwrapKey('raw', fromBase64(envelope.wrapped), kek, { name: 'AES-GCM', iv: fromBase64(envelope.iv) }, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  } catch {
    throw new CryptoError(messages().errors.privacy.wrongKey);
  }
}

// ---- Backup files ----

export type BackupKeys = { passphrase: KeyEnvelope; recovery: KeyEnvelope };

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  keys: BackupKeys;
  payload: { iv: string; data: string };
};

/** Seals the export's JSON text into a backup file (itself JSON, safe to store anywhere). */
export async function sealBackup(dataKey: CryptoKey, keys: BackupKeys, text: string, createdAt: string): Promise<string> {
  const iv = random(12);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, enc.encode(text));
  const file: BackupFile = { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt, keys, payload: { iv: toBase64(iv), data: toBase64(data) } };
  return JSON.stringify(file);
}

export function parseBackup(text: string): BackupFile {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new CryptoError(messages().errors.privacy.notBackup);
  }
  const f = file as Partial<BackupFile>;
  if (f?.format !== BACKUP_FORMAT || !f.keys?.passphrase || !f.keys.recovery || !f.payload?.data) throw new CryptoError(messages().errors.privacy.notBackup);
  if ((f.version ?? 0) > BACKUP_VERSION) throw new CryptoError(messages().errors.privacy.newer);
  return f as BackupFile;
}

/** Opens a backup with your passphrase or your recovery key, whichever you give. */
export async function openBackup(file: BackupFile, secret: string): Promise<string> {
  const recovery = normalizeRecoveryKey(secret);
  const dataKey = recovery ? await unwrapDataKey(file.keys.recovery, recovery).catch(() => unwrapDataKey(file.keys.passphrase, secret)) : await unwrapDataKey(file.keys.passphrase, secret);
  return decryptWith(dataKey, file);
}

/** Decrypts with a data key already in hand (to check a backup just written). */
export async function decryptWith(dataKey: CryptoKey, file: BackupFile): Promise<string> {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.payload.iv) }, dataKey, fromBase64(file.payload.data));
    return dec.decode(plain);
  } catch {
    throw new CryptoError(messages().errors.privacy.damaged);
  }
}

// ---- Passcodes for the app lock ----

export type PasscodeHash = { salt: string; iterations: number; hash: string };

export async function hashPasscode(passcode: string, iterations = KDF_ITERATIONS, salt: Uint8Array<ArrayBuffer> = random(16)): Promise<PasscodeHash> {
  const material = await crypto.subtle.importKey('raw', enc.encode(passcode.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256);
  return { salt: toBase64(salt), iterations, hash: toBase64(bits) };
}

export async function checkPasscode(passcode: string, stored: PasscodeHash): Promise<boolean> {
  const again = await hashPasscode(passcode, stored.iterations, fromBase64(stored.salt));
  // Same-length strings; compare every character so timing doesn't hint at how close a guess was.
  let diff = again.hash.length ^ stored.hash.length;
  for (let i = 0; i < Math.min(again.hash.length, stored.hash.length); i++) diff |= again.hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}
