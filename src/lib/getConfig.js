import { join } from "node:path";
import { merge } from "lodash-es";

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
export default async function getConfig() {
  const environment = process.env.NODE_ENV ?? "development";
  const definedConfig = (
    await import(join("file:///", process.cwd(), "libsqlrc.js"))
  ).default[environment];

  return merge(defaultConfig, definedConfig);
}
