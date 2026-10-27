import type { Profile } from '@/data';

export type FieldKey = 'gender' | 'birthday' | 'pronouns' | 'occupation' | 'city' | 'email' | 'phone';

/** The "About you" details, in the order they're shown. */
export const ABOUT_FIELDS: Array<{ key: FieldKey; label: string; type?: string; placeholder: string; inputMode?: 'email' | 'tel' }> = [
  { key: 'gender', label: 'Gender', placeholder: '' },
  { key: 'birthday', label: 'Birthday', type: 'date', placeholder: '' },
  { key: 'pronouns', label: 'Pronouns', placeholder: 'e.g. she / her' },
  { key: 'occupation', label: 'What you do', placeholder: 'Writer · runner' },
  { key: 'city', label: 'Home city', placeholder: 'Where home is' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', inputMode: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+84 …', inputMode: 'tel' },
];

export const GENDERS = ['Female', 'Male', 'Non-binary', 'Rather not say'];

export function fieldValue(profile: Profile, key: FieldKey): string {
  return (profile[key] ?? '') as string;
}
