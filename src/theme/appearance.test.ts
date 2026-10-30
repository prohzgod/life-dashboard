import { describe, expect, it } from 'vitest';
import { resolveAppearance } from './appearance';

describe('resolveAppearance', () => {
  const look = (background: 'dawn' | 'mist' | 'photo' | 'night') => ({ background, accent: 'tangerine' as const });

  it('shows the light background you picked in light mode', () => {
    expect(resolveAppearance('light', look('mist'), true)).toEqual({ theme: 'light', background: 'mist' });
    expect(resolveAppearance('system', look('photo'), false)).toEqual({ theme: 'light', background: 'photo' });
  });

  it('shows Night whenever it is dark', () => {
    expect(resolveAppearance('dark', look('dawn'), false)).toEqual({ theme: 'dark', background: 'night' });
    expect(resolveAppearance('system', look('mist'), true)).toEqual({ theme: 'dark', background: 'night' });
  });

  it('keeps Night dark even in light mode', () => {
    expect(resolveAppearance('light', look('night'), false)).toEqual({ theme: 'dark', background: 'night' });
  });
});
