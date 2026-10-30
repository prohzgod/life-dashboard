/**
 * Starter content follows the language you use. Anything the app wrote from its seed copy (sample
 * goal, habits, the weekly review and its note, life areas, budget categories, health metrics) is
 * swapped into the current language. A field is only touched while it still reads exactly as the
 * app wrote it in some language, so anything you have edited stays yours.
 */
import { LOCALES, messages } from '@/i18n/locale';
import { db } from './db';
import { localizeSystemNodes } from './library';

/** Every plain string in the seed copy, by its path ("habits.read.unit"). */
function leaves(value: unknown, path = '', out = new Map<string, string>()): Map<string, string> {
  if (typeof value === 'string') out.set(path, value);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) leaves(v, path ? `${path}.${k}` : k, out);
  return out;
}

/** Seed text in any language → the same text in the current one, for the seed paths given. */
export function seedTranslations(paths: readonly string[]): Map<string, string> {
  const inScope = (path: string) => paths.some((p) => path === p || path.startsWith(`${p}.`));
  const now = leaves(messages().seed);
  const map = new Map<string, string>();
  for (const locale of LOCALES) {
    for (const [path, text] of leaves(messages(locale).seed)) {
      const current = now.get(path);
      if (inScope(path) && current && current !== text) map.set(text, current);
    }
  }
  return map;
}

/** Which fields of which table the seed fills, and from which part of the seed copy. */
const FIELDS = {
  areas: { fields: ['name'], from: ['areas'] },
  goals: { fields: ['title', 'why'], from: ['yearGoal', 'yearGoalWhy', 'quarterGoal'] },
  tasks: { fields: ['title', 'notes'], from: ['weeklyReview', 'weeklyReviewNotes'] },
  habits: { fields: ['title', 'unit', 'cue'], from: ['habits', 'bedtime'] },
  metrics: { fields: ['name', 'unit'], from: ['metrics'] },
  budgets: { fields: ['name'], from: ['budgets'] },
} as const;

/** Renames seed content into the current language; returns how many records changed. */
export async function localizeSeedContent(): Promise<number> {
  let changed = await localizeSystemNodes();
  for (const [table, { fields, from }] of Object.entries(FIELDS) as Array<[keyof typeof FIELDS, { fields: readonly string[]; from: readonly string[] }]>) {
    const map = seedTranslations(from);
    if (!map.size) continue;
    await db.transaction('rw', db[table], async () => {
      const rows = (await db[table].toArray()) as unknown as Array<Record<string, unknown>>;
      const updated = rows.flatMap((row) => {
        const patch = Object.fromEntries(fields.flatMap((f) => (typeof row[f] === 'string' && map.has(row[f]) ? [[f, map.get(row[f])]] : [])));
        return Object.keys(patch).length ? [{ ...row, ...patch }] : [];
      });
      // Only the language changed, so the records keep their edit time.
      if (updated.length) await (db[table] as unknown as { bulkPut: (rows: unknown[]) => Promise<unknown> }).bulkPut(updated);
      changed += updated.length;
    });
  }
  return changed;
}
