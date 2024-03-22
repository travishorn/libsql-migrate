import { readdir } from "fs/promises";
import { join, parse } from "node:path";
import { getConfig, logger } from "./index.js";

/**
 * Represents a seed.
 *
 * @typedef {Object} Seed
 * @property {string} name - The name of the migration (from the filename)
 * @property {string} path - The path to the migration file.
 * @property {Function} run - The function to execute the seed.
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

  // Add the run function to each object
  return await Promise.all(
    files.map(async (file) => {
      const seed = await import(join("file:///", file.path));

      return {
        ...file,
        run: seed.seed,
      };
    }),
  );
}
