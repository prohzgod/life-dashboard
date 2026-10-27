/** Words that hint at one of the default life areas, for Inbox suggestions. A hint only: you always confirm. */
const AREA_HINTS: Record<string, string[]> = {
  health: ['run', 'gym', 'doctor', 'dentist', 'workout', 'yoga', 'sleep', 'meditat', 'walk', 'physio', 'pharmacy', 'vitamin'],
  career: ['work', 'meeting', 'client', 'project', 'deck', 'report', 'boss', 'interview', 'cv', 'resume', 'invoice', 'deadline', 'side project'],
  finance: ['pay', 'rent', 'bill', 'budget', 'bank', 'tax', 'insurance', 'savings', 'invest', 'transfer', 'receipt', 'subscription'],
  family: ['mom', 'mum', 'dad', 'parents', 'sister', 'brother', 'kids', 'grandma', 'grandpa', 'family'],
  friends: ['friend', 'birthday', 'party', 'drinks', 'catch up', 'catch-up'],
  growth: ['read', 'learn', 'course', 'essay', 'write', 'study', 'practice', 'podcast'],
  home: ['clean', 'laundry', 'plants', 'groceries', 'fix', 'repair', 'dry cleaning', 'dishes', 'garden', 'ikea'],
  fun: ['movie', 'concert', 'trip', 'travel', 'game', 'holiday', 'vacation', 'museum', 'hike'],
};

/** The area whose hint words appear in the title, or null when none (or more than one equally) match. */
export function suggestArea<T extends { id: string; name: string }>(title: string, areas: readonly T[]): T | null {
  const text = ` ${title.toLowerCase()} `;
  let best: T | null = null;
  let bestScore = 0;
  let tie = false;
  for (const area of areas) {
    const hints = AREA_HINTS[area.name.toLowerCase()] ?? [];
    const score = hints.filter((hint) => new RegExp(`[^\\p{L}]${escape(hint)}`, 'u').test(text)).length;
    if (score > bestScore) {
      best = area;
      bestScore = score;
      tie = false;
    } else if (score && score === bestScore) {
      tie = true;
    }
  }
  return tie ? null : best;
}

/** Titles that read like a someday idea rather than a task. */
export function looksLikeSomeday(title: string): boolean {
  const t = title.trim();
  return /^(idea|maybe|someday|wish)\b/i.test(t) || /^(book|film|movie|recipe|place)\s*:/i.test(t);
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
