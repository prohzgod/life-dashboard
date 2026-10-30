/*
 * The Glass v2 look: a background and an accent, on top of light or dark (src/theme/theme.ts).
 * Applied as data-theme / data-bg / data-accent on <html>; design/tokens.css does the rest.
 * index.html repeats `resolveAppearance` before first paint, so keep the two in step.
 */
import { readThemePreference, type ThemePreference } from './theme';

export type Background = 'dawn' | 'mist' | 'photo' | 'night';
export type AccentId = 'tangerine' | 'butter' | 'lime' | 'lavender';
export type Look = { background: Background; accent: AccentId };

export const BACKGROUNDS: readonly Background[] = ['dawn', 'mist', 'photo', 'night'];
export const ACCENTS: readonly AccentId[] = ['tangerine', 'butter', 'lime', 'lavender'];
export const ACCENT_COLORS: Record<AccentId, string> = { tangerine: '#FF7A45', butter: '#FFD25C', lime: '#CFF26B', lavender: '#B9A6FF' };
export const DEFAULT_LOOK: Look = { background: 'dawn', accent: 'tangerine' };
export const LOOK_STORAGE_KEY = 'life-dashboard:look';
/** Set while you have your own photo saved, so the first paint doesn't flash the sample photo. */
export const OWN_PHOTO_FLAG = 'life-dashboard:own-photo';
/** The default photo, bundled in public/ so it works offline. */
export const SAMPLE_PHOTO = '/backgrounds/dawn-hills-tall.jpg';

const listeners = new Set<() => void>();
let current: Look | null = null;

function isLook(value: unknown): value is Look {
  const v = value as Partial<Look> | null;
  return !!v && BACKGROUNDS.includes(v.background as Background) && ACCENTS.includes(v.accent as AccentId);
}

function storedLook(): Look {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LOOK_STORAGE_KEY) ?? 'null');
    return isLook(parsed) ? parsed : DEFAULT_LOOK;
  } catch {
    return DEFAULT_LOOK;
  }
}

export function readLook(): Look {
  return (current ??= storedLook());
}

/**
 * What shows: Night is always dark, and dark always shows Night (the light backgrounds would put
 * light glass under light text). With "system", your computer picks light or dark.
 */
export function resolveAppearance(mode: ThemePreference, look: Look, systemDark: boolean): { theme: 'light' | 'dark'; background: Background } {
  const dark = look.background === 'night' || (mode === 'system' ? systemDark : mode === 'dark');
  if (dark) return { theme: 'dark', background: 'night' };
  return { theme: 'light', background: look.background === 'night' ? 'dawn' : look.background };
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
}

export function applyAppearance(root: HTMLElement = document.documentElement, mode: ThemePreference = readThemePreference(), look: Look = readLook()) {
  const { theme, background } = resolveAppearance(mode, look, systemDark());
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-bg', background);
  root.setAttribute('data-accent', look.accent);
}

export function setLook(look: Look) {
  current = look;
  try {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify(look));
  } catch {
    // Storage can be blocked (private mode); the look still applies for this visit.
  }
  if (typeof document !== 'undefined') applyAppearance();
  listeners.forEach((listener) => listener());
}

export function subscribeLook(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LOOK_STORAGE_KEY) return;
    current = storedLook();
    applyAppearance();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Keeps data-theme / data-bg in step with the computer's light or dark setting. */
export function followSystemAppearance() {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onChange = () => applyAppearance();
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

let photoUrl: string | null = null;

/** Shows your own photo behind the app (or the sample photo again, with null). */
export function showOwnPhoto(blob: Blob | null, root: HTMLElement = document.documentElement) {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = blob ? URL.createObjectURL(blob) : null;
  if (photoUrl) root.style.setProperty('--bg-image', `url("${photoUrl}")`);
  else root.style.removeProperty('--bg-image');
  try {
    if (blob) localStorage.setItem(OWN_PHOTO_FLAG, '1');
    else localStorage.removeItem(OWN_PHOTO_FLAG);
  } catch {
    // Only the first paint uses the flag.
  }
}
