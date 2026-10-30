import { intlLocale, messages } from '@/i18n/locale';
import { downloadText } from './download';

/** Saves the recovery key as a small text file, with what it's for and how to keep it. */
export function downloadRecoveryKit(key: string) {
  const t = messages().seed.recoveryKit;
  const text = [t.title, t.made(new Date().toLocaleString(intlLocale())), '', `${t.key}  ${key}`, '', t.opens, t.keep, t.anyone, ''].join('\n');
  downloadText('life-dashboard-recovery-kit.txt', text, 'text/plain');
}
