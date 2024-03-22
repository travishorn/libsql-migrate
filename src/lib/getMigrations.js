import { readdir } from "fs/promises";
import { join, parse } from "node:path";
import { createClient } from "@libsql/client";
import { getConfig, logger } from "./index.js";

/**
 * Retrieves information about the latest and next migrations.
 *
 * @async
 * @function getMigrations
 * @returns {Promise<{latest: Object|null, next: Object|null}>} An object containing information about the latest and next migrations.
 */
export default async function getMigrations() {
  const config = await getConfig();
  const client = createClient(config.connection);
  const directory = join(process.cwd(), config.migrations.directory);
  let files = [];

  await client.execute(`
    CREATE TABLE IF NOT EXISTS libsql_migrate (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      batch INTEGER NOT NULL,
      migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const latestRecord = (
    await client.execute(`
    SELECT    id,
              name,
              batch,
              migrated_at AS migratedAt
    FROM      libsql_migrate
    ORDER BY  migrated_at DESC
    LIMIT     1;",
  `)
  ).rows[0];

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

  let latestFile;
  let latest;
  let latestFileIndex;
  let nextFile = null;
  let next = null;

  if (latestRecord) {
    latestFile = files.find((file) => file.name === latestRecord.name);
    latest = await import(join("file:///", latestFile.path));
    latestFileIndex = files.findIndex(
      (file) => file.name === latestRecord.name,
    );

    if (files.length > latestFileIndex + 1) {
      nextFile = files[latestFileIndex + 1];
    }
  } else {
    nextFile = files[0];
  }

  if (nextFile) {
    next = await import(join("file:///", nextFile.path));
  }

  return {
    latest: latestRecord
      ? {
          id: latestRecord.id,
          name: latestFile.name,
          batch: latestRecord.batch,
          migratedAt: new Date(latestRecord.migratedAt),
          path: latestFile.path,
          up: latest.up,
          down: latest.down,
        }
      : null,
    next: next
      ? {
          name: nextFile.name,
          path: nextFile.path,
          up: next.up,
          down: next.down,
        }
      : null,
  };
}
