import { writeFileIfNotExists, logger } from "../lib/index.js";

const configTemplate = `/**
* Configuration object for libsql-migrate.
* @typedef {Object} LibsqlMigrateConfig
* @property {Object} [development] - Configuration for development environment.
* @property {Object} [development.connection] - Connection configuration for development environment.
* @property {string} [development.connection.url] - URL for development environment connection.
* @property {Object} [production] - Configuration for production environment (optional).
* @property {Object} [production.connection] - Connection configuration for production environment.
* @property {string} [production.connection.url] - URL for production environment connection.
* @property {string} [production.connection.authToken] - Authentication token for production environment connection.
*/

/**
* Configuration object for libsql-migrate.
* @type {LibsqlMigrateConfig}
*/
export default {
  development: {
    connection: {
      url: "file:local.db",
    },
  },
  production: {
    connection: {
      url: "libsql://...",
      authToken: "...",
    },
  },
};
`;

/**
 * Creates a fresh libsqlrc.js configuration file.
 *
 * @async
 * @function init
 * @returns {Promise<void>} A promise that resolves when the file is written.
 * @example
 * // Creates a file called `libsqlrc.js` with the default configuration in the
 * // project root.
 * await init();
 */
export default async function init() {
  const filePath = "libsqlrc.js";
  await writeFileIfNotExists(filePath, configTemplate, "utf-8");
  logger.info(`Template configuration file written to ${filePath}.`);
}
