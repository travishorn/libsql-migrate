import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

// Read the version from package.json
const version = JSON.parse(
  await readFile(
    join(fileURLToPath(new URL(".", import.meta.url)), "../../package.json"),
    "utf-8",
  ),
).version;

/**
 * Gets the CLI version
 *
 * @returns {string} - The CLI version
 * @example
 * const version = getVersion(); // Will be "1.0.6" for example
 */
export default function getVersion() {
  return version;
}
