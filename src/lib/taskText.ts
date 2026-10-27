import type { Day } from '@/domain/days';
import { formatDayShort, weekdayName } from './format';

/** "Rolled over from yesterday", "… from Thursday", "… from 12 Oct". */
export function rolledOverText(days: number, doOn: Day): string {
  if (days === 1) return 'Rolled over from yesterday';
  if (days < 7) return `Rolled over from ${weekdayName(doOn)}`;
  return `Rolled over from ${formatDayShort(doOn)}`;
}
