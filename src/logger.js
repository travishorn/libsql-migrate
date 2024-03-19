import { createLogger, format, transports } from "winston";

export default createLogger({
  level: "info",
  format: format.simple(),
  transports: [new transports.Console()],
});
