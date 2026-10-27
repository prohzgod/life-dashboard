import { backupDue, backupFileName, backupsToPrune, formatBytes, passcodeProblem, passphraseProblem, shouldLock } from './privacy';

describe('shouldLock', () => {
  const t = Date.parse('2026-10-27T10:00:00Z');
  it('locks after the chosen time away', () => {
    expect(shouldLock(t, t + 4 * 60_000, 5)).toBe(false);
    expect(shouldLock(t, t + 5 * 60_000, 5)).toBe(true);
    expect(shouldLock(t, t + 1, 0)).toBe(true);
  });
  it('never locks by itself when you chose so, or when you never left', () => {
    expect(shouldLock(t, t + 10 * 3600_000, null)).toBe(false);
    expect(shouldLock(null, t, 0)).toBe(false);
  });
});

describe('passcodes and passphrases', () => {
  it('explain what would make them work', () => {
    expect(passcodeProblem('123')).toMatch(/at least 4/);
    expect(passcodeProblem('1111')).toMatch(/less easy/);
    expect(passcodeProblem('2468')).toBeNull();
    expect(passphraseProblem('short')).toMatch(/at least 10/);
    expect(passphraseProblem('quiet river lamp')).toBeNull();
  });
});

describe('backupDue', () => {
  const at = (s: string) => new Date(s);
  it('runs once a day after 03:00', () => {
    expect(backupDue(null, at('2026-10-27T09:00'))).toBe(true);
    expect(backupDue(at('2026-10-27T03:02').toISOString(), at('2026-10-27T20:00'))).toBe(false);
    expect(backupDue(at('2026-10-26T22:00').toISOString(), at('2026-10-27T09:00'))).toBe(true);
    // Before 03:00, the last boundary is yesterday's.
    expect(backupDue(at('2026-10-26T10:00').toISOString(), at('2026-10-27T02:00'))).toBe(false);
    expect(backupDue(at('2026-10-26T02:00').toISOString(), at('2026-10-27T02:00'))).toBe(true);
  });
});

describe('backup files', () => {
  it('are named by time and pruned oldest first, leaving other files alone', () => {
    expect(backupFileName(new Date(2026, 9, 27, 3, 2))).toBe('life-dashboard-2026-10-27-0302.backup.json');
    const names = ['life-dashboard-2026-10-25-0300.backup.json', 'notes.txt', 'life-dashboard-2026-10-27-0302.backup.json', 'life-dashboard-2026-10-26-0301.backup.json'];
    expect(backupsToPrune(names, 2)).toEqual(['life-dashboard-2026-10-25-0300.backup.json']);
    expect(backupsToPrune(names, 5)).toEqual([]);
  });
});

describe('formatBytes', () => {
  it('reads like the design', () => {
    expect(formatBytes(212 * 1024 * 1024)).toBe('212 MB');
    expect(formatBytes(1.4 * 1024 ** 3)).toBe('1.4 GB');
    expect(formatBytes(96 * 1024)).toBe('96 KB');
    expect(formatBytes(500)).toBe('500 B');
  });
});
