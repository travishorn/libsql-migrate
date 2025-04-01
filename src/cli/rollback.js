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
    ).reverse();

    const results = [];
    for (const migration of migrations.latestBatch) {
      if (typeof config.hooks?.beforeMigration === "function") {
        await config.hooks.beforeMigration("down", migration.name);
      }

      let result;
      try {
        result = await migration.down(client);
        results.push(result);
      } catch (err) {
        if (typeof config.hooks?.onError === "function") {
          config.hooks.onError("down", migration.name, err);
        }
        throw err;
      }

      if (typeof config.hooks?.afterMigration === "function") {
        await config.hooks.afterMigration("down", migration.name, result);
      }

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

    const names = migrations.latestBatch.map((migration) => migration.name)
    const plural = migrations.latestBatch.length !== 1;

    if (typeof config.hooks?.afterMigrations === "function") {
      await config.hooks.afterMigrations("down", names, results);
    }

    logger.info(
      `Rolled back ${migrations.latestBatch.length} migration${plural ? "s" : ""}: ${names.join(", ")}.`,
    );
  } else {
    logger.info("Database schema is rolled back as far as possible.");
  }
}
