import { writeFile } from "node:fs/promises";
import { mkdirp } from "mkdirp";
import { join } from "node:path";

/**
 * The contents of a default migration file.
 * @type {string}
 */
const defaultMigration = `/**
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
 * Generates a timestamp string representing the current UTC date and time in the format YYYYMMDD
 * @returns {string} The timestamp string.
 * @example
 * // If called on March 18, 2024 at 22:25:30 UTC, returns `20240318222530`.
 * const now = timestamp();
 */
function timestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  const second = String(now.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * Creates a new migration file with the given name. The name will be prepended by the date & time.
 * @async
 * @function make
 * @param {string} name - The name of the migration file.
 * @returns {Promise<void>} A promise that resolves when the migration file is written.
 * @example
 * // Example usage:
 * // Creates a migration file named `20240318222530_example.js` in the configured migrations directory.
 * await make("example");
 */
export default async function make(name) {
  const environment = process.env.NODE_ENV ?? "development";
  const config = (await import(join("file:///", process.cwd(), "libsqlrc.js")))
    .default[environment];
  const directory = join(
    process.cwd(),
    config.migrations?.directory ?? "./migrations",
  );
  const filename = `${timestamp()}_${name}.js`;
  await mkdirp(directory);
  await writeFile(join(directory, filename), defaultMigration, "utf-8");
}
