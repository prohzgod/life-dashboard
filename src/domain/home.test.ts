import { allowedSize, DEFAULT_WIDGETS, WIDGET_SIZES } from './home';

describe('home widgets', () => {
  it('keeps every default within its allowed sizes', () => {
    for (const w of DEFAULT_WIDGETS) expect(WIDGET_SIZES[w.kind]).toContain(w.size);
  });

  it('falls back to the nearest allowed size', () => {
    expect(allowedSize('today', 'S')).toBe('M');
    expect(allowedSize('sleep', 'L')).toBe('M');
    expect(allowedSize('goals', 'L')).toBe('L');
  });
});
