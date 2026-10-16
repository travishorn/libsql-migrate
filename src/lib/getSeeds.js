import { readdir } from "fs/promises";
import { join, parse } from "node:path";
import { pathToFileURL } from "node:url";
import { getConfig, logger } from "./index.js";

/**
 * Represents a seed.
 *
 * @typedef {Object} Seed
 * @property {string} name - The name of the migration (from the filename)
 * @property {string} path - The path to the migration file.
 * @property {Function} run - The function to execute the seed. Imports the seed file on first call.
 */

/**
 * Retrieves seeds from seed files.
 *
 * @returns {Promise<{Seed[]}>} An array containing seeds.
 * @example
 * const seeds = await getSeeds();
 */
export default async function getSeeds() {
  const config = await getConfig();
  const directory = join(process.cwd(), config.seeds.directory);
  let files = [];

  // Try to read seed files from directory
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
      logger.warn(`Seeds directory ${config.seeds.directory} does not exist.`);
      return;
    } else {
      return error;
    }
  }

  if (files.length === 0) {
    logger.warn(`No seed files found in ${config.seeds.directory}.`);
    return;
  }

  // Import each seed file lazily, when its seed() is about to run, so that
  // seeds which do not run are never loaded.
  return files.map((file) => {
    const url = pathToFileURL(file.path);

    return {
      ...file,
      run: async (client) => (await import(url)).seed(client),
    };
  });
}
