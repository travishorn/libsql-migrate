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
export default async function up() {
  const migrations = await getMigrations();
  const config = await getConfig();
  const client = createClient(config.connection);

  if (migrations.latest) {
    await migrations.latest.down(client);

    await client.execute({
      sql: `
        DELETE FROM libsql_migrate
        WHERE       id = :id;
      `,
      args: { id: migrations.latest.id },
    });

    logger.info(`Rolled back 1 migration: ${migrations.latest.name}.`);
  } else {
    logger.warn("Database schema is rolled back as far as possible.");
  }
}
