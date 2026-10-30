import type { Profile } from '@/data';

export type FieldKey = 'gender' | 'birthday' | 'pronouns' | 'occupation' | 'city' | 'email' | 'phone';

/** The "About you" details, in the order they're shown. Labels come from `profile.fields`. */
export const ABOUT_FIELDS: Array<{ key: FieldKey; type?: string; inputMode?: 'email' | 'tel' }> = [
  { key: 'gender' },
  { key: 'birthday', type: 'date' },
  { key: 'pronouns' },
  { key: 'occupation' },
  { key: 'city' },
  { key: 'email', type: 'email', inputMode: 'email' },
  { key: 'phone', type: 'tel', inputMode: 'tel' },
];

/** Stored as these values whatever the language; `profile.genders` says how each reads. */
export const GENDERS = ['Female', 'Male', 'Non-binary', 'Rather not say'];

export function fieldValue(profile: Profile, key: FieldKey): string {
  return (profile[key] ?? '') as string;
}
