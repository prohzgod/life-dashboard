/** Rules for the app lock and automatic backups. Pure: times come in, decisions come out. */

/** Minutes away before the app locks; 0 locks as soon as you leave, null never (until you lock it yourself or reopen). */
export type LockAfter = 0 | 1 | 5 | 15 | 60 | null;
export const LOCK_AFTER_OPTIONS: ReadonlyArray<{ value: LockAfter; label: string }> = [
  { value: 0, label: 'Right away' },
  { value: 1, label: '1 minute away' },
  { value: 5, label: '5 minutes away' },
  { value: 15, label: '15 minutes away' },
  { value: 60, label: '1 hour away' },
  { value: null, label: 'Only when I lock it' },
];

/** Whether the app should be locked on coming back, after being hidden since `hiddenAt`. */
export function shouldLock(hiddenAt: number | null, now: number, after: LockAfter): boolean {
  if (hiddenAt === null || after === null) return false;
  return now - hiddenAt >= after * 60_000;
}

export const PASSCODE_MIN = 4;

/** A plain reason the passcode won't do, or null when it's fine. */
export function passcodeProblem(passcode: string): string | null {
  if (passcode.length < PASSCODE_MIN) return `Use at least ${PASSCODE_MIN} characters.`;
  if (/^(\d)\1+$/.test(passcode)) return 'Pick something less easy to guess than one digit repeated.';
  return null;
}

export const PASSPHRASE_MIN = 10;

/** Backup passphrases protect files that may sit in a cloud folder, so they need more length than a passcode. */
export function passphraseProblem(passphrase: string): string | null {
  if (passphrase.trim().length < PASSPHRASE_MIN) return `Use at least ${PASSPHRASE_MIN} characters. A few unrelated words works well.`;
  return null;
}

/** Daily backups run once after the backup hour (03:00 by default), the first time the app is open. */
export function backupDue(lastAt: string | null, now: Date, hour = 3): boolean {
  if (!lastAt) return true;
  const boundary = new Date(now);
  boundary.setHours(hour, 0, 0, 0);
  if (now < boundary) boundary.setDate(boundary.getDate() - 1);
  return new Date(lastAt) < boundary;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "life-dashboard-2026-10-27-0302.backup.json", sorting by name sorts by time. */
export function backupFileName(at: Date): string {
  return `life-dashboard-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}.backup.json`;
}

const BACKUP_NAME = /^life-dashboard-\d{4}-\d{2}-\d{2}-\d{4}\.backup\.json$/;

/** Older backup files beyond the newest `keep`; other files in the folder are never touched. */
export function backupsToPrune(names: readonly string[], keep: number): string[] {
  return names
    .filter((n) => BACKUP_NAME.test(n))
    .sort()
    .reverse()
    .slice(keep);
}

/** "212 MB", "1.4 GB", "96 KB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}
