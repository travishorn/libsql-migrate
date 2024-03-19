import { access, constants, writeFile } from "fs/promises";

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
export default async function writeFileIfNotExists(filePath, data) {
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
