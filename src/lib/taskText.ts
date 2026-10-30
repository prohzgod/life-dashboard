import type { Day } from '@/domain/days';
import { messages } from '@/i18n';
import { formatDayShort, weekdayName } from './format';

/** "Rolled over from yesterday", "… from Thursday", "… from 12 Oct". */
export function rolledOverText(days: number, doOn: Day): string {
  const t = messages().tasks;
  if (days === 1) return t.rolledYesterday;
  if (days < 7) return t.rolledFrom(weekdayName(doOn));
  return t.rolledFrom(formatDayShort(doOn));
}
