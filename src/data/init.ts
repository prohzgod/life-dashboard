import { ensureCalendars } from './calendar';
import { ensureBudgets } from './finance';
import { ensureHealthMetrics } from './health';
import { dataTableNames, db } from './db';
import { ensureHomeWidgets } from './homeWidgets';
import { localizeSeedContent } from './localize';
import { ensureProfile } from './profile';
import { seedIfNeeded } from './seed';

let ready: Promise<void> | null = null;

/** What first start wrote, so anything else on this device can be told apart as yours. */
async function rememberSeedRows() {
  const rows: string[] = [];
  for (const name of dataTableNames) for (const id of await db[name].toCollection().primaryKeys()) rows.push(`${name}:${String(id)}`);
  await db.meta.put({ key: 'seedRows', value: rows });
}

/** Opens the database and seeds a first launch. Safe to call more than once. */
export function initData(): Promise<void> {
  ready ??= (async () => {
    await db.open();
    const firstStart = !(await db.meta.get('seededAt'));
    await seedIfNeeded();
    // Rows added after the first seed: created on the first start that needs them.
    await ensureHomeWidgets();
    await ensureProfile();
    await ensureCalendars();
    await ensureBudgets();
    await ensureHealthMetrics();
    // Starter content made in another language follows the one you use now.
    await localizeSeedContent();
    if (firstStart) await rememberSeedRows();
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

/** For tests: forget the cached init so the next call runs again. */
export function resetInitForTests() {
  ready = null;
}
