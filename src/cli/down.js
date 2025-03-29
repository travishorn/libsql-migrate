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

    if (typeof config.hooks?.beforeMigration === 'function') {
      await config.hooks.beforeMigration('down', latest.name);
    }

    let result;
    try {
      result = await latest.down(client);
    }
    catch (err) {
      if (typeof config.hooks?.onError === 'function') {
        config.hooks.onError('down', latest.name, err);
      }
      throw err;
    }

    if (typeof config.hooks?.afterMigration === 'function') {
      await config.hooks.afterMigration('down', latest.name, result);
    }

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
