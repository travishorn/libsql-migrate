import { mkdirp } from "mkdirp";
import { join } from "node:path";
import { getConfig, logger, writeFileIfNotExists } from "../lib/index.js";

const seedTemplate = `/**
* Seeds the database with preset data.
* @param client - The libsql client to use when migrating.
* @returns { Promise<void> }
*/
export async function seed(client) {
  
}
`;

/**
 * Creates a new seed file with the given name.
 *
 * @async
 * @function seedMake
 * @param {string} name - The name of the seed file.
 * @returns {Promise<void>} A promise that resolves when the seed file is written.
 * @example
 * // Creates a migration file named `example.js` in the configured seeds
 * // directory.
 * await seedMake("example");
 */
export default async function seedMake(name) {
  const config = await getConfig();
  const directory = join(process.cwd(), config.seeds.directory);
  const filename = `${name}.js`;

  try {
    await mkdirp(directory);
    await writeFileIfNotExists(
      join(directory, filename),
      seedTemplate,
      "utf-8",
    );
  } catch (err) {
    if (typeof config.hooks?.onError === "function") {
      await config.hooks.onError("seed:make", name, err);
    }
    throw err;
  }

  logger.info(
    `New seed file created at ${config.seeds.directory}/${filename}.`,
  );
}
