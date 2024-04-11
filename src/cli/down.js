import { createClient } from "@libsql/client";
import { getConfig, getMigrations, logger } from "../lib/index.js";

/**
 * Finds and rolls back the latest migration that was run by checking the
 * the latest database record and applying the `down()` migration of the
 * matching migration file.
 *
 * @async
 * @function down
 * @returns {Promise<void>} A promise that resolves when the latest migration is rolled back.
 * @example
 * await down();
 */
export default async function down() {
  const migrations = await getMigrations();
  const config = await getConfig();
  const client = createClient(config.connection);

  if (migrations.completed) {
    const latest = migrations.completed[migrations.completed.length - 1];
    await latest.down(client);

    await client.execute({
      sql: `
        DELETE FROM libsql_migrate
        WHERE       name = :name;
      `,
      args: { name: latest.name },
    });

    logger.info(`Rolled back 1 migration: ${latest.name}.`);
  } else {
    logger.info("Database schema is rolled back as far as possible.");
  }
}
