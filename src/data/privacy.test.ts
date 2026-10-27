// @vitest-environment node
import { backupDue } from '@/domain/privacy';
import { importReplacingAll } from './backup';
import {
  changePassphrase,
  checkUnlock,
  getPrivacyState,
  makeBackup,
  newRecoveryKit,
  noteBackup,
  openBackupFile,
  PrivacyError,
  removePasscode,
  runAutomaticBackup,
  setBackupOptions,
  setLockOptions,
  setPasscode,
  setUpEncryption,
} from './privacy';
import { tasksRepo } from './repositories';
import { freshDatabase } from './testing';

beforeEach(freshDatabase);

// Few KDF rounds keep tests quick.
const FAST = 1000;

describe('app lock', () => {
  it('sets, checks and removes a passcode', async () => {
    await expect(setPasscode('12', FAST)).rejects.toThrow(PrivacyError);
    await setPasscode('2468', FAST);
    expect((await getPrivacyState()).lock.passcode).not.toBeNull();
    expect(await checkUnlock('2468')).toBe(true);
    expect(await checkUnlock('1357')).toBe(false);
    await expect(removePasscode('1357')).rejects.toThrow('That passcode isn’t right.');
    await removePasscode('2468');
    expect((await getPrivacyState()).lock.passcode).toBeNull();
  });

  it('keeps the lock options', async () => {
    await setLockOptions({ after: 15, hideMoney: true });
    expect((await getPrivacyState()).lock).toMatchObject({ after: 15, hideMoney: true, blurInSwitcher: true });
  });
});

describe('encrypted backups', () => {
  it('make a backup that opens with the passphrase or the recovery key and restores', async () => {
    await expect(makeBackup()).rejects.toThrow('Set a backup passphrase first.');
    const recovery = await setUpEncryption('quiet river lamp', FAST);
    await tasksRepo.create({ areaId: null, goalId: null, keyResultId: null, parentTaskId: null, title: 'Back me up', notes: '', status: 'open', priority: null, doOn: null, time: null, dueAt: null, estimateMin: null, rrule: null, reminderAt: null, completedAt: null, sortKey: 'a0', repeatOfId: null });
    const { name, text } = await makeBackup(new Date(2026, 9, 27, 3, 2));
    expect(name).toBe('life-dashboard-2026-10-27-0302.backup.json');
    expect(text).not.toContain('Back me up');

    await expect(openBackupFile(text, 'not it')).rejects.toThrow(PrivacyError);
    const viaRecovery = await openBackupFile(text, recovery);
    expect(viaRecovery.tables.tasks?.length).toBeGreaterThan(0);

    await setLockOptions({ after: 60 });
    const file = await openBackupFile(text, 'quiet river lamp');
    await importReplacingAll(file);
    expect((await tasksRepo.list()).map((t) => t.title)).toContain('Back me up');
    // Device settings survive a restore.
    expect((await getPrivacyState()).lock.after).toBe(60);
    expect((await getPrivacyState()).encryption.on).toBe(true);
  });

  it('changes the passphrase; old backups open with the new one', async () => {
    const recovery = await setUpEncryption('quiet river lamp', FAST);
    const { text } = await makeBackup();
    await expect(changePassphrase('wrong guess', 'bright morning tide', FAST)).rejects.toThrow(PrivacyError);
    await changePassphrase(recovery, 'bright morning tide', FAST);
    const { text: newer } = await makeBackup();
    expect((await openBackupFile(newer, 'bright morning tide')).format).toBe('life-dashboard-export');
    // The old file carries its own wrapped keys, so the old passphrase still opens it.
    expect((await openBackupFile(text, 'quiet river lamp')).format).toBe('life-dashboard-export');
  });

  it('makes a new recovery kit', async () => {
    const old = await setUpEncryption('quiet river lamp', FAST);
    const fresh = await newRecoveryKit('quiet river lamp', FAST);
    expect(fresh).not.toBe(old);
    const { text } = await makeBackup();
    expect((await openBackupFile(text, fresh)).format).toBe('life-dashboard-export');
    await expect(openBackupFile(text, old)).rejects.toThrow(PrivacyError);
  });

  it('records the last backup and only runs automatically when set up', async () => {
    expect(await runAutomaticBackup()).toBe('off');
    await setUpEncryption('quiet river lamp', FAST);
    await setBackupOptions({ enabled: true, keep: 7 });
    expect(await runAutomaticBackup()).toBe('off'); // no folder: backups download instead
    await noteBackup(1234, true, '2026-10-27T03:02:00.000Z');
    const { backup } = await getPrivacyState();
    expect(backup).toMatchObject({ enabled: true, keep: 7, lastSize: 1234, lastVerified: true });
    expect(backupDue(backup.lastAt, new Date('2026-10-27T20:00:00'))).toBe(false);
  });
});
