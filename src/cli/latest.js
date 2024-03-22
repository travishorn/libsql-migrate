import { createClient } from "@libsql/client";
import { getConfig, getMigrations, logger } from "../lib/index.js";

/**
 * Finds and runs all migrations that have not yet been run by checking the
 * migration directory against the latest database record.
 *
 * @async
 * @function up
 * @returns {Promise<void>} A promise that resolves when the pending migrations are completed.
 * @example
 * await latest();
 */
export default async function up() {
  const migrations = await getMigrations();
  const config = await getConfig();
  const client = createClient(config.connection);

  if (migrations.pending) {
    const batch = migrations.latest ? migrations.latest.batch + 1 : 1;

    for (const migration of migrations.pending) {
      await migration.up(client);
      await client.execute({
        sql: `
          INSERT INTO libsql_migrate (
            name,
            batch
          ) VALUES (
            :name,
            :batch
          );
        `,
        args: {
          name: migration.name,
          batch,
        },
      });
    }

    const names = migrations.pending
      .map((migration) => migration.name)
      .join(", ");

    logger.info(`Ran ${migrations.pending.length} migrations: ${names}`);
  } else {
    logger.info("Database schema is up-to-date.");
  }
}
