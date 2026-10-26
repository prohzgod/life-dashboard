import { db } from './db';
import { seedIfNeeded } from './seed';
import { setCurrentSpaceId } from './session';

let ready: Promise<void> | null = null;

/** Opens the database, seeds a first launch, and picks the current space. Safe to call more than once. */
export function initData(): Promise<void> {
  ready ??= (async () => {
    await db.open();
    setCurrentSpaceId(await seedIfNeeded());
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
