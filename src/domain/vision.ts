/** Vision board layout: card sizes, quote type sizes, the free canvas and the phone columns. */

export type CardSize = 'S' | 'L';
export type CanvasRect = { x: number; y: number; w: number; h: number };

/** Grid rows a card spans on the desktop board (each card is 2 of 6 columns wide). */
export const GRID_ROWS: Record<CardSize, number> = { S: 2, L: 3 };

/** Words set big when they're short, smaller as they grow, so a card never overflows. */
export function wordsFontSize(text: string, size: CardSize, phone = false): number {
  const n = text.trim().length;
  const steps = phone ? [28, 24, 21, 18, 16] : [41, 34, 31, 26, 22];
  const room = size === 'L' ? 1.4 : 1;
  const i = n <= 26 * room ? 0 : n <= 32 * room ? 1 : n <= 44 * room ? 2 : n <= 70 * room ? 3 : 4;
  return steps[i]!;
}

/** Free canvas geometry: cards snap to an 8px grid and stay on the board. */
export const CANVAS = { width: 1200, minHeight: 760, snap: 8, minW: 160, minH: 120 } as const;

export function snapTo(n: number, step: number = CANVAS.snap): number {
  return Math.round(n / step) * step;
}

/** Keeps a card on the board (never off the left, top or right edge) and at least the minimum size. */
export function clampRect(rect: CanvasRect, boardWidth: number = CANVAS.width): CanvasRect {
  const w = Math.min(boardWidth, Math.max(CANVAS.minW, snapTo(rect.w)));
  const h = Math.max(CANVAS.minH, snapTo(rect.h));
  return { x: Math.min(boardWidth - w, Math.max(0, snapTo(rect.x))), y: Math.max(0, snapTo(rect.y)), w, h };
}

/**
 * Where cards without a saved canvas position go: the same dense packing as the grid
 * (three columns, rows of `row` px), so switching to the canvas starts from what you see.
 */
export function packCanvas(sizes: readonly CardSize[], width: number = CANVAS.width, row = 132, gap = 14): CanvasRect[] {
  const colW = (width - 2 * gap) / 3;
  const heights = [0, 0, 0];
  return sizes.map((size) => {
    const col = heights.indexOf(Math.min(...heights));
    const rows = GRID_ROWS[size];
    const h = rows * row + (rows - 1) * gap;
    const rect = { x: Math.round(col * (colW + gap)), y: heights[col]!, w: Math.round(colW), h };
    heights[col] = heights[col]! + h + gap;
    return rect;
  });
}

/** The board's height: tall enough for every card, never shorter than the minimum. */
export function canvasHeight(rects: readonly CanvasRect[]): number {
  return Math.max(CANVAS.minHeight, ...rects.map((r) => r.y + r.h + 40));
}

/** Card heights on phones, in px: pictures run taller than words. Vision.module.css uses the same. */
export const PHONE_HEIGHTS = { words: { S: 150, L: 200 }, image: { S: 170, L: 230 } } as const;

/** Phones show two columns; each card goes into the shorter one, keeping the board's order. */
export function twoColumns<T extends { size: CardSize; kind: 'words' | 'image' }>(cards: readonly T[]): [T[], T[]] {
  const cols: [T[], T[]] = [[], []];
  const used = [0, 0];
  for (const card of cards) {
    const i = used[0]! <= used[1]! ? 0 : 1;
    cols[i].push(card);
    used[i] = used[i]! + PHONE_HEIGHTS[card.kind][card.size];
  }
  return cols;
}
