export type WidgetKind = 'today' | 'goals' | 'calendar' | 'review' | 'progress' | 'sleep' | 'finance' | 'vision' | 'assistant' | 'steps' | 'pinned';
export type WidgetSize = 'S' | 'M' | 'L';

/** Sizes each widget can take. S = half width, one row; M = half width, two rows; L = full width, one row. */
export const WIDGET_SIZES: Record<WidgetKind, readonly WidgetSize[]> = {
  today: ['M', 'L'],
  goals: ['S', 'M', 'L'],
  calendar: ['S', 'M', 'L'],
  review: ['M', 'L'],
  progress: ['S', 'M', 'L'],
  sleep: ['S', 'M'],
  finance: ['S', 'M'],
  vision: ['S', 'M'],
  assistant: ['S', 'M', 'L'],
  steps: ['S', 'M'],
  pinned: ['S', 'M', 'L'],
};

export const SIZE_SPAN: Record<WidgetSize, { cols: number; rows: number }> = {
  S: { cols: 2, rows: 1 },
  M: { cols: 2, rows: 2 },
  L: { cols: 4, rows: 1 },
};

/** What a new Home looks like: the design's layout, with Ask AI and Steps waiting in the sheet. */
export const DEFAULT_WIDGETS: ReadonlyArray<{ kind: Exclude<WidgetKind, 'pinned'>; size: WidgetSize; hidden: boolean }> = [
  { kind: 'today', size: 'L', hidden: false },
  { kind: 'goals', size: 'M', hidden: false },
  { kind: 'calendar', size: 'M', hidden: false },
  { kind: 'review', size: 'L', hidden: false },
  { kind: 'progress', size: 'M', hidden: false },
  { kind: 'sleep', size: 'S', hidden: false },
  { kind: 'finance', size: 'S', hidden: false },
  { kind: 'vision', size: 'S', hidden: false },
  { kind: 'assistant', size: 'M', hidden: true },
  { kind: 'steps', size: 'S', hidden: true },
];

/** A size the widget allows: the asked one if possible, else the nearest it has. */
export function allowedSize(kind: WidgetKind, size: WidgetSize): WidgetSize {
  const sizes = WIDGET_SIZES[kind];
  if (sizes.includes(size)) return size;
  return size === 'L' ? sizes.at(-1)! : sizes[0]!;
}
