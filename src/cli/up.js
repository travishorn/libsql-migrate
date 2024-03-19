import { createClient } from "@libsql/client";
import { getConfig, getMigrations, logger } from "../lib/index.js";

/**
 * Finds and runs the next migration that has not yet been run by checking the
 * migration directory against the latest database record.
 *
 * @async
 * @function up
 * @returns {Promise<void>} A promise that resolves when the next migration is completed.
 * @example
 * await up();
 */
export default async function up() {
  try {
    const migrations = await getMigrations();
    const config = await getConfig();
    const client = createClient(config.connection);

    if (migrations.next) {
      await migrations.next.up(client);

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
          name: migrations.next.name,
          batch: migrations.latest?.batch ?? 1,
        },
      });

      logger.info(`Ran 1 migration: ${migrations.next.name}.`);
    } else {
      logger.warn("Database schema is up-to-date.");
    }
  } catch (error) {
    logger.error(error);
  }
}
