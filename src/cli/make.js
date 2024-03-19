import { writeFile } from "node:fs/promises";
import { mkdirp } from "mkdirp";
import { join } from "node:path";
import { timestamp, getConfig } from "../lib.js";
import logger from "../logger.js";

/**
 * The contents of a template migration file.
 * @type {string}
 */
const migrationTemplate = `/**
* Migrates the database schema upward, making changes to bring the schema toward the latest version.
* @param client - The libsql client to use when migrating.
* @returns { Promise<void> }
*/
export async function up(client) {
  
}

/**
* Migrates the database schema downward, making changes to roll the schema back to a previous version.
* @param client - The libsql client to use when migrating.
* @returns { Promise<void> }
*/
export async function down(client) {

}
`;

/**
 * Creates a new migration file with the given name. The name will be prepended
 * by the date & time.
 *
 * @async
 * @function make
 * @param {string} name - The name of the migration file.
 * @returns {Promise<void>} A promise that resolves when the migration file is written.
 * @example
 * // Creates a migration file named `20240318222530_example.js` in the
 * // configured migrations directory.
 * await make("example");
 */
export default async function make(name) {
  try {
    const config = await getConfig();
    const directory = join(process.cwd(), config.migrations.directory);
    const filename = `${timestamp()}_${name}.js`;
    await mkdirp(directory);
    await writeFile(join(directory, filename), migrationTemplate, "utf-8");
    logger.info(
      `New migration created at ${config.migrations.directory}/${filename}.`,
    );
  } catch (error) {
    logger.error(error);
  }
}
