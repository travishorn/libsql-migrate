import { writeFile } from "node:fs/promises";

const defaultConfig = `export default {
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

export default async function init() {
  await writeFile("libsqlrc.js", defaultConfig, "utf-8");
}
