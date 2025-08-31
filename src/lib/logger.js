import { createLogger, format, transports } from "winston";

/**
 * A Winston logger instance configured for console output with simple formatting.
 * Used throughout the application for consistent logging.
 *
 * @type {import('winston').Logger}
 * @example
 * logger.info("Migration completed successfully");
 * logger.warn("No migration files found");
 * logger.error("Database connection failed");
 */
export default createLogger({
  level: "info",
  format: format.simple(),
  transports: [new transports.Console()],
});
