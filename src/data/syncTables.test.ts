import { SYNC_TABLES } from '@shared';
import { dataTableNames } from './db';

it("SYNC_TABLES matches the app's data tables", () => {
  expect([...SYNC_TABLES].sort()).toEqual([...dataTableNames].sort());
});
