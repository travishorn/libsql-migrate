import { readdir, rm, unlink } from "node:fs/promises";
import { expect, test } from "vitest";
import init from "../../src/cli/init.js";
import make from "../../src/cli/make.js";

test("Makes a migration file", async () => {
  const directory = "./migrations";
  await init();
  await make("test");
  const files = await readdir(directory);
  const testFile = files.find((file) => file.slice(-7) === "test.js");
  expect(testFile).toBeDefined();
  await rm(directory, { recursive: true, force: true });
  await unlink("libsqlrc.js");
});
