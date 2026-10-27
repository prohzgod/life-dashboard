import { dayOfMonth, month, year, type Day } from './days';

export type Visibility = 'shown' | 'blurred';

/** Age in whole years on `today`, from a birthday. */
export function ageOn(birthday: Day, today: Day): number {
  let age = year(today) - year(birthday);
  if (month(today) < month(birthday) || (month(today) === month(birthday) && dayOfMonth(today) < dayOfMonth(birthday))) age--;
  return age;
}

/** The letter for an avatar without a photo. */
export function initialOf(name: string): string {
  const letter = name.trim().match(/\p{L}/u)?.[0];
  return letter ? letter.toUpperCase() : '';
}

/** Personal details default to blurred; the ones you'd say out loud default to shown. */
export const DEFAULT_VISIBILITY: Record<string, Visibility> = {
  displayName: 'shown',
  quote: 'shown',
  gender: 'shown',
  pronouns: 'shown',
  occupation: 'shown',
  birthday: 'blurred',
  city: 'blurred',
  email: 'blurred',
  phone: 'blurred',
};

export function visibilityOf(visibility: Readonly<Record<string, Visibility>>, field: string): Visibility {
  return visibility[field] ?? DEFAULT_VISIBILITY[field] ?? 'blurred';
}
