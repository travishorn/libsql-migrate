import { access, constants, writeFile } from "fs/promises";
import { join } from "node:path";
import { merge } from "lodash-es";

/**
 * Default configuration object for libsql-migrate.
 *
 * @type {Object}
 * @property {Object} migrations - Configuration for migrations.
 * @property {string} migrations.directory - Directory path containing migration files.
 */
const defaultConfig = {
  migrations: { directory: "./migrations" },
};

/**
 * Retrieves the configuration settings based on the current environment. Reads
 * the configuration from a 'libsqlrc.js' file located in the current working
 * directory. If no NODE_ENV environment variable is found, defaults to the
 * 'development' environment.
 *
 * @async
 * @function getConfig
 * @returns {Promise<Object>} A promise resolving to an object containing merged default and defined configurations.
 */
export async function getConfig() {
  const environment = process.env.NODE_ENV ?? "development";
  const definedConfig = (
    await import(join("file:///", process.cwd(), "libsqlrc.js"))
  ).default[environment];

  return merge(defaultConfig, definedConfig);
}

/**
 * Writes data to a file only if the file does not already exist. Throws an
 * error if the file already exists.
 *
 * @async
 * @param {string} filePath - The path to the file.
 * @param {string | Buffer | Uint8Array} data - The data to be written to the file.
 * @returns {Promise<void>} - A Promise that resolves when the file has been written successfully.
 * @throws {Error} - If the file already exists or if any other error occurs during the process.
 * @example
 * await writeFileIfNotExists("greeting.txt", "Hello, World!");
 */
export async function writeFileIfNotExists(filePath, data) {
  try {
    await access(filePath, constants.F_OK);
    throw new Error(`${filePath} already exists. Aborting.`);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(filePath, data, "utf-8");
    } else {
      throw error;
    }
  }
}

/**
 * Generates a timestamp string representing the current UTC date and time in
 * the format YYYYMMDDhhmmss.
 *
 * @returns {string} The timestamp string.
 * @example
 * // If called on March 18, 2024 at 22:25:30 UTC, returns `20240318222530`.
 * const now = timestamp();
 */
export function timestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  const second = String(now.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}
