import { downloadText } from './download';

/** Saves the recovery key as a small text file, with what it's for and how to keep it. */
export function downloadRecoveryKit(key: string) {
  const text = [
    'Life Dashboard recovery kit',
    `Made ${new Date().toLocaleString()}`,
    '',
    `Recovery key:  ${key}`,
    '',
    'This key opens your encrypted backups if you forget your passphrase.',
    'Keep it somewhere safe and offline: printed, or in a password manager.',
    'Anyone with this key and one of your backup files can read your data.',
    '',
  ].join('\n');
  downloadText('life-dashboard-recovery-kit.txt', text, 'text/plain');
}
