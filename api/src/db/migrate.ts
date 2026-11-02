import { createPostgresDb, migratePostgres } from './db';

/** Runs before the server starts on Render. */
async function main() {
  const { db, close } = createPostgresDb(process.env.DATABASE_URL!);
  await migratePostgres(db);
  await close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
