// @vitest-environment node
import {
  checkPasscode,
  CryptoError,
  fromBase64,
  hashPasscode,
  newDataKey,
  newRecoveryKey,
  normalizeRecoveryKey,
  openBackup,
  parseBackup,
  sealBackup,
  toBase64,
  unwrapDataKey,
  wrapDataKey,
} from './crypto';

// Fewer KDF rounds keep the tests quick; the app uses KDF_ITERATIONS.
const FAST = 1000;

describe('base64', () => {
  it('round-trips bytes, including large ones', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });
});

describe('recovery keys', () => {
  it('are 32 characters in groups of four', () => {
    const key = newRecoveryKey();
    expect(key).toMatch(/^([A-Z2-7]{4}-){7}[A-Z2-7]{4}$/);
    expect(newRecoveryKey()).not.toBe(key);
  });

  it('accept loose typing', () => {
    const key = newRecoveryKey();
    expect(normalizeRecoveryKey(key.toLowerCase().replaceAll('-', ' '))).toBe(key);
    expect(normalizeRecoveryKey('ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ23-4567'.replace('O', '0'))).toBe('ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ23-4567');
    expect(normalizeRecoveryKey('too short')).toBeNull();
  });
});

describe('backups', () => {
  async function setup() {
    const dataKey = await newDataKey();
    const recovery = newRecoveryKey();
    const keys = { passphrase: await wrapDataKey(dataKey, 'correct horse', FAST), recovery: await wrapDataKey(dataKey, recovery, FAST) };
    return { dataKey, recovery, keys };
  }

  it('opens with the passphrase or the recovery key, and nothing else', async () => {
    const { dataKey, recovery, keys } = await setup();
    const text = await sealBackup(dataKey, keys, '{"hello":"world"}', '2026-10-27T03:02:00.000Z');
    expect(text).not.toContain('world');
    const file = parseBackup(text);
    expect(await openBackup(file, 'correct horse')).toBe('{"hello":"world"}');
    expect(await openBackup(file, recovery.toLowerCase())).toBe('{"hello":"world"}');
    await expect(openBackup(file, 'wrong')).rejects.toThrow(CryptoError);
  });

  it('notices damage', async () => {
    const { dataKey, keys } = await setup();
    const file = parseBackup(await sealBackup(dataKey, keys, 'secret', 'x'));
    const data = fromBase64(file.payload.data);
    data[0] = data[0]! ^ 1;
    await expect(openBackup({ ...file, payload: { ...file.payload, data: toBase64(data) } }, 'correct horse')).rejects.toThrow(/damaged/);
  });

  it('rejects files that are not backups, or from a newer app', () => {
    expect(() => parseBackup('not json')).toThrow(CryptoError);
    expect(() => parseBackup('{"format":"other"}')).toThrow(/isn’t a Life Dashboard backup/);
    expect(() => parseBackup(JSON.stringify({ format: 'life-dashboard-backup', version: 99, keys: { passphrase: {}, recovery: {} }, payload: { data: 'x' } }))).toThrow(/newer version/);
  });

  it('rewraps the same data key under a new passphrase', async () => {
    const { dataKey, keys } = await setup();
    const text = await sealBackup(dataKey, keys, 'old backup', 'x');
    const opened = await unwrapDataKey(keys.passphrase, 'correct horse');
    const newKeys = { ...keys, passphrase: await wrapDataKey(opened, 'battery staple', FAST) };
    expect(await openBackup({ ...parseBackup(text), keys: newKeys }, 'battery staple')).toBe('old backup');
  });
});

describe('passcodes', () => {
  it('check the right passcode and refuse others', async () => {
    const stored = await hashPasscode('2468', FAST);
    expect(stored.hash).not.toContain('2468');
    expect(await checkPasscode('2468', stored)).toBe(true);
    expect(await checkPasscode('2469', stored)).toBe(false);
  });
});
