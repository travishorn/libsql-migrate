import { setConfigPath } from "./getConfig.js";

/**
 * Handles command-line options for the CLI. Currently supports setting a custom
 * configuration file path via the --config option.
 *
 * @function handleOptions
 * @param {Object} command - The command object from the CLI framework.
 * @example
 * // Handle options from a command
 * handleOptions(command);
 */
export default function handleOptions(command) {
  const options = command.opts();

  if (options.config) {
    setConfigPath(options.config);
  }
}
