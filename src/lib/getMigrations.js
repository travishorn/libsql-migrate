import { readdir } from "fs/promises";
import { join, parse } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { getConfig, logger } from "./index.js";

/**
 * Represents a database migration.
 *
 * @typedef {Object} Migration
 * @property {string} name - The name of the migration (from the filename)
 * @property {string} path - The path to the migration file.
 * @property {Function} up - The function to execute when migrating up.
 * @property {Function} down - The function to execute when migrating down.
 * @property {number} [batch] - The batch number in which the migration was completed.
 * @property {Date} [migratedAt] - The timestamp of when the migration was completed.
 */

/**
 * Retrieves pending and completed migrations.
 *
 * @returns {Promise<{pending: Migration[], completed: Migration[]}>} An object containing arrays of pending and completed migrations.
 * @example
 * const migrations = await getMigrations();
 */
export default async function getMigrations() {
  const config = await getConfig();
  const client = createClient(config.connection);
  const directory = join(process.cwd(), config.migrations.directory);
  let files = [];

  // Try to read migration files from directory
  try {
    files = (await readdir(directory))
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
        `Migrations directory ${config.migrations.directory} does not exist.`,
      );
      return;
    } else {
      return error;
    }
  }

  if (files.length === 0) {
    logger.warn(`No migration files found in ${config.migrations.directory}.`);
    return;
  }

  // Add the up and down functions to each object
  const migrations = await Promise.all(
    files.map(async (file) => {
      const migration = await import(pathToFileURL(file.path));

      return {
        ...file,
        up: migration.up,
        down: migration.down,
      };
    }),
  );

  // Get migration records
  await client.execute(`
    CREATE TABLE IF NOT EXISTS libsql_migrate (
      name TEXT NOT NULL,
      batch INTEGER NOT NULL,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const records = (
    await client.execute(`
    SELECT    name,
              batch,
              migrated_at AS migratedAt
    FROM      libsql_migrate
    ORDER BY  migrated_at;
  `)
  ).rows;

  // Where is the latest migration in the array?
  const latestRecord = records.length ? records[records.length - 1] : null;
  const latestIndex = migrations.findIndex(
    (migration) => migration.name === latestRecord?.name,
  );

  // Split the migrations into pending and completed
  const pending =
    latestIndex + 1 < migrations.length
      ? migrations.slice(latestIndex + 1)
      : null;
  let completed =
    latestIndex > -1 ? migrations.slice(0, latestIndex + 1) : null;

  // Enhance completed migrations with info from the database
  if (records.length) {
    completed = completed.map((migration) => {
      const record = records.find((record) => record.name === migration.name);
      return {
        ...migration,
        batch: record.batch,
        migratedAt: new Date(record.migratedAt),
      };
    });
  }

  return {
    pending,
    completed,
  };
}
