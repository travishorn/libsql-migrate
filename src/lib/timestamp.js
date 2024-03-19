/**
 * Generates a timestamp string representing the current UTC date and time in
 * the format YYYYMMDDhhmmss.
 *
 * @returns {string} The timestamp string.
 * @example
 * // If called on March 18, 2024 at 22:25:30 UTC, returns `20240318222530`.
 * const now = timestamp();
 */
export default function timestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  const second = String(now.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}
