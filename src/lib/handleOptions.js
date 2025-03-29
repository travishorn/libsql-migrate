import { setConfigPath } from "./getConfig.js";

export default function handleOptions(command) {
  const options = command.opts();

  if (options.config) {
    setConfigPath(options.config);
  }
}
