import { createClient } from "@libsql/client";
import { getConfig, getMigrations, logger } from "../lib/index.js";

/**
 * Finds and runs all migrations that have not yet been run by checking the
 * migration directory against the latest database record.
 *
 * @async
 * @function latest
 * @returns {Promise<void>} A promise that resolves when the pending migrations are completed.
 * @example
 * await latest();
 */
export default async function latest() {
  const migrations = await getMigrations();
  const config = await getConfig();
  const client = createClient(config.connection);

  if (migrations.pending) {
    const batch = migrations.completed
      ? migrations.completed[migrations.completed.length - 1].batch + 1
      : 1;

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

    const plural = migrations.pending.length !== 1;

    logger.info(
      `Ran ${migrations.pending.length} migration${plural ? "s" : ""}: ${names}.`,
    );
  } else {
    logger.info("Database schema is up-to-date.");
  }
}
