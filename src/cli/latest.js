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

    const results = [];
    for (const migration of migrations.pending) {
      if (typeof config.hooks?.beforeMigration === "function") {
        await config.hooks.beforeMigration("up", migration.name);
      }

      let result;
      try {
        result = await migration.up(client);
        results.push(result);
      } catch (err) {
        if (typeof config.hooks?.onError === "function") {
          await config.hooks.onError("up", migration.name, err);
        }
        throw err;
      }

      if (typeof config.hooks?.afterMigration === "function") {
        await config.hooks.afterMigration("up", migration.name, result);
      }

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

    const names = migrations.pending.map((migration) => migration.name);
    const plural = migrations.pending.length !== 1;

    if (typeof config.hooks?.afterMigrations === "function") {
      await config.hooks.afterMigrations("up", names, results);
    }

    logger.info(
      `Ran ${migrations.pending.length} migration${plural ? "s" : ""}: ${names.join(", ")}.`,
    );
  } else {
    logger.info("Database schema is up-to-date.");
  }
}
