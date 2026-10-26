import { db } from './db';
import { initData, resetInitForTests } from './init';

/** Wipes the (fake) database and runs first launch again. Use in beforeEach. */
export async function freshDatabase() {
  resetInitForTests();
  db.close();
  await db.delete();
  await initData();
}
