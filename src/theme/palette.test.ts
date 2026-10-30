import { presetIds, presets } from '@design/themes';
import { contrast, customSeeds, deriveColors, paletteCss, readPalette, setPalette } from './palette';

const checks = (c: ReturnType<typeof deriveColors>) => ({
  body: contrast(c.ink, c.bg),
  captions: contrast(c['ink-3'], c.bg),
  links: contrast(c.link, c.bg),
  onField: contrast(c['on-inverse'], c.inverse),
  onPrimary: contrast(c['on-primary'], c.primary),
  markText: contrast(c['accent-ink'], c['accent-soft']),
});

describe('colour themes', () => {
  it.each(presetIds.flatMap((id) => (['light', 'dark'] as const).map((mode) => [id, mode] as const)))('%s in %s keeps text readable', (id, mode) => {
    const r = checks(deriveColors(presets[id][mode], mode));
    expect(r.body).toBeGreaterThanOrEqual(7);
    expect(r.captions).toBeGreaterThanOrEqual(4.5);
    expect(r.links).toBeGreaterThanOrEqual(4.5);
    expect(r.onField).toBeGreaterThanOrEqual(4.5);
    expect(r.onPrimary).toBeGreaterThanOrEqual(7);
    expect(r.markText).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['a pale yellow on white', { background: '#FFFFFF', main: '#F5D90A', mark: '#FF9F1C' }],
    ['a dark background', { background: '#101820', main: '#2EC4B6', mark: '#FF3366' }],
    ['a mid grey background', { background: '#B8B8B8', main: '#3344AA', mark: '#CC2222' }],
  ])('a custom theme with %s keeps text readable in both modes', (_, custom) => {
    const seeds = customSeeds(custom);
    for (const mode of ['light', 'dark'] as const) {
      const r = checks(deriveColors(seeds[mode], mode));
      expect(r.body).toBeGreaterThanOrEqual(4.5);
      expect(r.links).toBeGreaterThanOrEqual(4.5);
      expect(r.onField).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses your background in its own mode', () => {
    expect(customSeeds({ background: '#101820', main: '#2EC4B6', mark: '#FF3366' }).dark.paper).toBe('#101820');
    expect(customSeeds({ background: '#FAF0E6', main: '#2EC4B6', mark: '#FF3366' }).light.paper).toBe('#FAF0E6');
  });

  it('adds no CSS for Grid, and saves the choice on this device', () => {
    expect(paletteCss({ id: 'grid' })).toBe('');
    setPalette({ id: 'nature' });
    expect(readPalette()).toEqual({ id: 'nature' });
    expect(document.documentElement.dataset.palette).toBe('nature');
    expect(document.getElementById('palette')?.textContent).toContain('--bg:#F5F2EA');
    setPalette({ id: 'grid' });
    expect(document.getElementById('palette')).toBeNull();
    expect(document.documentElement.hasAttribute('data-palette')).toBe(false);
  });
});
