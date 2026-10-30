import type { Area } from '@design/tokens';
import { describeRRuleShort, parseRRule } from '@/domain/recurrence';
import type { ParsedCapture } from '@/domain/quickAdd';
import type { Day } from '@/domain/days';
import { Chip, type ChipTone } from '@/components/ui';
import { useT } from '@/i18n';
import { formatDayRelative, formatMinutes } from '@/lib/format';
import styles from './CaptureChips.module.css';

type CaptureChipsProps = {
  parsed: ParsedCapture;
  today: Day;
  areas: ReadonlyArray<{ name: string; color: Area }>;
};

const PRIORITY = {
  1: { label: 'highPriority', tone: 'danger' },
  2: { label: 'mediumPriority', tone: 'warning' },
  3: { label: 'lowPriority', tone: 'neutral' },
} as const satisfies Record<1 | 2 | 3, { label: string; tone: ChipTone }>;

/** What the quick-add line will save, shown as chips before you press Enter. */
export function CaptureChips({ parsed, today, areas }: CaptureChipsProps) {
  const t = useT();
  const rule = parsed.rrule ? parseRRule(parsed.rrule) : null;
  const area = areas.find((a) => a.name === parsed.areaName);
  const chips: Array<{ key: string; label: string; tone: ChipTone; dot?: boolean }> = [];

  if (parsed.doOn) chips.push({ key: 'day', label: formatDayRelative(parsed.doOn, today) + (parsed.time ? `, ${parsed.time}` : ''), tone: 'neutral' });
  if (rule) chips.push({ key: 'repeat', label: describeRRuleShort(rule), tone: 'primary' });
  if (parsed.dueOn) {
    const day = formatDayRelative(parsed.dueOn, today);
    chips.push({ key: 'due', label: t.tasks.dueChip(day, [t.format.today, t.format.tomorrow, t.format.yesterday].includes(day)), tone: 'warning' });
  }
  if (area) chips.push({ key: 'area', label: area.name, tone: area.color, dot: true });
  if (parsed.priority) chips.push({ key: 'priority', label: t.tasks[PRIORITY[parsed.priority].label], tone: PRIORITY[parsed.priority].tone });
  if (parsed.estimateMin) chips.push({ key: 'estimate', label: `~${formatMinutes(parsed.estimateMin)}`, tone: 'neutral' });
  for (const tag of parsed.tags) chips.push({ key: `tag-${tag}`, label: `#${tag}`, tone: 'neutral' });
  if (parsed.someday) chips.push({ key: 'someday', label: t.tasks.someday, tone: 'accent' });

  if (!chips.length) return null;
  return (
    <div className={styles.chips} aria-label={t.tasks.willBeSaved}>
      {chips.map((chip) => (
        <Chip key={chip.key} tone={chip.tone} dot={chip.dot}>
          {chip.label}
        </Chip>
      ))}
    </div>
  );
}
