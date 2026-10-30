import { ensureCalendars } from './calendar';
import { ensureBudgets } from './finance';
import { ensureHealthMetrics } from './health';
import { db } from './db';
import { ensureHomeWidgets } from './homeWidgets';
import { localizeSystemNodes } from './library';
import { ensureProfile } from './profile';
import { seedIfNeeded } from './seed';

let ready: Promise<void> | null = null;

/** Opens the database and seeds a first launch. Safe to call more than once. */
export function initData(): Promise<void> {
  ready ??= (async () => {
    await db.open();
    await seedIfNeeded();
    // Rows added after the first seed: created on the first start that needs them.
    await ensureHomeWidgets();
    await ensureProfile();
    await ensureCalendars();
    await ensureBudgets();
    await ensureHealthMetrics();
    // Folders made in another language follow the one you use now.
    await localizeSystemNodes();
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
