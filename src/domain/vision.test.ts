import { canvasHeight, clampRect, packCanvas, snapTo, twoColumns, wordsFontSize } from './vision';

describe('wordsFontSize', () => {
  it('sets short words big and long words smaller', () => {
    expect(wordsFontSize('Strong body, quiet mind.', 'S')).toBe(41);
    expect(wordsFontSize('Sunday dinners, phones away.', 'S')).toBe(34);
    expect(wordsFontSize('Calm.', 'S')).toBe(41);
    expect(wordsFontSize('Six months saved. Calm about money.', 'S')).toBe(31);
    expect(wordsFontSize('A long sentence about what a good year looks like for the whole family, every week.', 'S')).toBe(22);
    expect(wordsFontSize('Strong body, quiet mind.', 'S', true)).toBe(28);
  });

  it('gives tall cards more room', () => {
    expect(wordsFontSize('Six months saved. Calm about money.', 'L')).toBe(41);
  });
});

describe('free canvas', () => {
  it('snaps and keeps cards on the board', () => {
    expect(snapTo(13)).toBe(16);
    expect(clampRect({ x: -40, y: -3, w: 90, h: 50 })).toEqual({ x: 0, y: 0, w: 160, h: 120 });
    expect(clampRect({ x: 1150, y: 200, w: 300, h: 200 })).toEqual({ x: 896, y: 200, w: 304, h: 200 });
  });

  it('starts from the same packing as the grid', () => {
    const rects = packCanvas(['S', 'L', 'S', 'S'], 1200, 132, 14);
    expect(rects.map((r) => [r.x, r.y, r.h])).toEqual([
      [0, 0, 278],
      [405, 0, 424],
      [809, 0, 278],
      [0, 292, 278],
    ]);
    expect(canvasHeight(rects)).toBe(760);
    expect(canvasHeight([{ x: 0, y: 900, w: 200, h: 200 }])).toBe(1140);
  });
});

describe('twoColumns', () => {
  it('fills the shorter column, in order', () => {
    const card = (id: string, kind: 'words' | 'image', size: 'S' | 'L') => ({ id, kind, size });
    // Heights: words S 150, image L 230, image S 170, words S 150.
    const [left, right] = twoColumns([card('a', 'words', 'S'), card('b', 'image', 'L'), card('c', 'image', 'S'), card('d', 'words', 'S'), card('e', 'words', 'S')]);
    expect(left.map((c) => c.id)).toEqual(['a', 'c', 'e']);
    expect(right.map((c) => c.id)).toEqual(['b', 'd']);
  });
});
