import { unlink, writeFile } from "node:fs/promises";
import { expect, test } from "vitest";
import fileHash from "./fileHash.js";

test("Correctly hashes an empty file", async () => {
  await writeFile("testfile", "", "utf-8");
  expect(await fileHash("testfile")).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  await unlink("testfile");
});

test("Correctly hashes a file with content", async () => {
  await writeFile("testfile", "Hello, World!", "utf-8");
  expect(await fileHash("testfile")).toBe(
    "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
  );
  await unlink("testfile");
});
