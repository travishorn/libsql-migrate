import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { merge } from "lodash-es";

let configPath = join(process.cwd(), "libsqlrc.js");

const defaultConfig = {
  migrations: { directory: "./migrations" },
  seeds: { directory: "./seeds" },
};

/**
 * Sets the path to the configuration file. This allows customizing where the
 * configuration file is located relative to the current working directory.
 *
 * @function setConfigPath
 * @param {string} path - The path to the configuration file.
 * @example
 * // Set config path to a custom location
 * setConfigPath("config/database.js");
 */
export function setConfigPath(path) {
  configPath = join(process.cwd(), path);
}

/**
 * Gets the current path to the configuration file.
 *
 * @function getConfigPath
 * @returns {string} The absolute path to the configuration file.
 * @example
 * const configPath = getConfigPath(); // Returns "/path/to/libsqlrc.js"
 */
export function getConfigPath() {
  return configPath;
}

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
export default async function getConfig() {
  const environment = process.env.NODE_ENV ?? "development";
  const definedConfig = (await import(pathToFileURL(configPath))).default[
    environment
  ];

  return merge(defaultConfig, definedConfig);
}
