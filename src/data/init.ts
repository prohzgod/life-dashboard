import { ensureCalendars } from './calendar';
import { ensureBudgets } from './finance';
import { ensureHealthMetrics } from './health';
import { db } from './db';
import { ensureHomeWidgets } from './homeWidgets';
import { ensureProfile } from './profile';
import { seedIfNeeded } from './seed';
import { setCurrentSpaceId } from './session';

let ready: Promise<void> | null = null;

/** Opens the database, seeds a first launch, and picks the current space. Safe to call more than once. */
export function initData(): Promise<void> {
  ready ??= (async () => {
    await db.open();
    setCurrentSpaceId(await seedIfNeeded());
    // Rows added after the first seed: created on the first start that needs them.
    await ensureHomeWidgets();
    await ensureProfile();
    await ensureCalendars();
    await ensureBudgets();
    await ensureHealthMetrics();
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

/** For tests: forget the cached init so the next call runs again. */
export function resetInitForTests() {
  ready = null;
  setCurrentSpaceId(null);
}
