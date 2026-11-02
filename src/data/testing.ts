import { db } from './db';
import { initData, resetInitForTests } from './init';
import { setSyncState } from './sync/state';

/** Wipes the (fake) database and runs first launch again. Use in beforeEach. */
export async function freshDatabase() {
  resetInitForTests();
  setSyncState('off');
  db.close();
  await db.delete();
  await initData();
}
