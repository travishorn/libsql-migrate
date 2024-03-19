import { join, parse } from "node:path";
import { readdir } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { getConfig } from "../lib.js";
import logger from "../logger.js";

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
    const config = await getConfig();
    const directory = join(process.cwd(), config.migrations.directory);
    let migrationFiles = [];

    try {
      migrationFiles = (await readdir(directory))
        .filter((file) => file.endsWith(".js"))
        .sort()
        .map((file) => {
          const { name } = parse(file);

          return {
            name,
            path: join(directory, file),
          };
        });
    } catch (error) {
      if (error.code === "ENOENT") {
        logger.warn(
          `Migrations directory ${config.migrations.directory} does not exist. No migrations to run.`,
        );
        return;
      } else {
        return error;
      }
    }

    if (migrationFiles.length > 0) {
      let migrationFile = migrationFiles[0];
      let batch = 1;

      const client = createClient(config.connection);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS libsql_migrate (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          batch INTEGER NOT NULL,
          migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const latestMigrations = await client.execute(`
        SELECT    name,
                  batch
        FROM      libsql_migrate
        ORDER BY  migrated_at DESC
        LIMIT     1;",
      `);

      if (latestMigrations.rows.length === 1) {
        const latestMigration = latestMigrations.rows[0];
        const latestMigrationIndex = migrationFiles.findIndex(
          (migrationFile) => migrationFile.name === latestMigration.name,
        );

        if (migrationFiles.length > latestMigrationIndex + 1) {
          migrationFile = migrationFiles[latestMigrationIndex + 1];
          batch = latestMigration.batch + 1;
        } else {
          logger.info("The database schema is already up-to-date.");
          return;
        }
      }

      const migration = await import(join("file:///", migrationFile.path));

      await migration.up(client);

      await client.execute({
        sql: `
          INSERT INTO libsql_migrate (
            name,
            batch
          ) VALUES (
            :migrationName,
            :batch
          );
        `,
        args: { migrationName: migrationFile.name, batch },
      });

      logger.info(`Ran 1 migration: ${migrationFile.name}.`);
    } else {
      logger.warn(
        `No migration files found in ${config.migrations.directory}. No migrations to run.`,
      );
    }
  } catch (error) {
    logger.error(error);
  }
}
