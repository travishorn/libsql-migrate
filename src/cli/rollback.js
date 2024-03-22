import { createClient } from "@libsql/client";
import { getConfig, getMigrations, logger } from "../lib/index.js";

/**
 * Finds and rolls back the latest batch of migrations that was run by checking
 * the the latest database record and applying the `down()` migration of all
 * migration files in that batch.
 *
 * @async
 * @function rollback
 * @returns {Promise<void>} A promise that resolves when the migrations are rolled back.
 * @example
 * await rollback();
 */
export default async function rollback() {
  const migrations = await getMigrations();
  const config = await getConfig();
  const client = createClient(config.connection);

  if (migrations.completed) {
    const batch = migrations.completed[migrations.completed.length - 1].batch;

    migrations.latestBatch = migrations.completed.filter(
      (migration) => migration.batch === batch,
    );

    for (const migration of migrations.latestBatch) {
      await migration.down(client);
      await client.execute({
        sql: `
          DELETE FROM libsql_migrate
          WHERE       name = :name;
        `,
        args: {
          name: migration.name,
        },
      });
    }

    const names = migrations.latestBatch
      .map((migration) => migration.name)
      .join(", ");

    logger.info(
      `Rolled back ${migrations.latestBatch.length} migrations: ${names}`,
    );
  } else {
    logger.info("Database schema is rolled back as far as possible.");
  }
}
