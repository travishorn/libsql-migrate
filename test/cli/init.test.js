import { unlink, writeFile } from "node:fs/promises";
import { expect, test } from "vitest";
import fileHash from "../fileHash.js";
import init from "../../src/cli/init.js";

const configTemplateHash =
  "e8fab2c6e7c5fd9726a9ab68223b2fc59dd8fe9227b36414403246e165a2263b";
const emptyObjectHash =
  "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

test("Creates a libsqlrc.js configuration file", async () => {
  await init();
  expect(await fileHash("libsqlrc.js")).toBe(configTemplateHash);
  await unlink("libsqlrc.js");
});

test("Does not overwrite existing configuration", async () => {
  await writeFile("libsqlrc.js", "{}", "utf-8");
  await init();
  expect(await fileHash("libsqlrc.js")).toBe(emptyObjectHash);
  await unlink("libsqlrc.js");
});
