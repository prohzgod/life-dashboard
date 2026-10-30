import { diffDays, type Day } from '@/domain/days';
import { behindByDays, expectedPercent, paceStatus } from '@/domain/pace';
import { messages } from '@/i18n';

export type PaceReading = { expected: number; status: 'on-pace' | 'behind'; sentence: string };

/** Pace for a goal with dates: where it should be today and a plain sentence about it. */
export function readPace(progress: number, startDate: Day, endDate: Day, today: Day): PaceReading {
  const expected = expectedPercent(new Date(`${startDate}T00:00:00Z`), new Date(`${endDate}T00:00:00Z`), new Date(`${today}T00:00:00Z`));
  const status = paceStatus(progress, expected);
  const t = messages().goals;
  if (status === 'on-pace') return { expected, status, sentence: t.onPace };
  const days = behindByDays(progress, expected, diffDays(startDate, endDate) + 1);
  const sentence = days >= 14 ? t.pace.weeksBehind(Math.round(days / 7)) : days >= 2 ? t.pace.daysBehind(days) : t.pace.littleBehind;
  return { expected, status, sentence };
}
