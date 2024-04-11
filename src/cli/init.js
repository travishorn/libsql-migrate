import { writeFileIfNotExists, logger } from "../lib/index.js";

const configTemplate = `/**
* Configuration object for libsql-migrate.
* @typedef {Object.<string, {
*   connection: {
*     url: string,
*     authToken?: string
*   }
* }>} LibsqlMigrateConfig
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
