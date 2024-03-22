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
  const migrations = await getMigrations();
  const config = await getConfig();
  const client = createClient(config.connection);

  if (migrations.pending) {
    const next = migrations.pending[0];
    const latest = migrations.completed
      ? migrations.completed[migrations.completed.length - 1]
      : null;
    await next.up(client);

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
        name: next.name,
        batch: latest ? latest.batch + 1 : 1,
      },
    });

    logger.info(`Ran 1 migration: ${next.name}.`);
  } else {
    logger.warn("Database schema is up-to-date.");
  }
}
