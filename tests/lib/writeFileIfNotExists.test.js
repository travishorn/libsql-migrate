import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import writeFileIfNotExists from "../../src/lib/writeFileIfNotExists.js";

describe("writeFileIfNotExists", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a file with the given content when it does not exist", async () => {
    const filePath = join(tempDir, "test.txt");
    await writeFileIfNotExists(filePath, "hello world");
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("hello world");
  });

  it("throws an error when the file already exists", async () => {
    const filePath = join(tempDir, "existing.txt");
    await writeFileIfNotExists(filePath, "original");
    await expect(writeFileIfNotExists(filePath, "new content")).rejects.toThrow(
      `${filePath} already exists. Aborting.`,
    );
  });

  it("preserves original content when file already exists", async () => {
    const filePath = join(tempDir, "existing.txt");
    await writeFileIfNotExists(filePath, "original content");
    try {
      await writeFileIfNotExists(filePath, "new content");
    } catch {
      // expected
    }
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("original content");
  });

  it("uses utf-8 encoding by default", async () => {
    const filePath = join(tempDir, "utf8.txt");
    const text = "héllo wörld";
    await writeFileIfNotExists(filePath, text);
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe(text);
  });

  it("accepts a custom encoding", async () => {
    const filePath = join(tempDir, "encoded.txt");
    await writeFileIfNotExists(filePath, "hello", "ascii");
    const content = await readFile(filePath, "ascii");
    expect(content).toBe("hello");
  });

  it("creates the file so it can be accessed", async () => {
    const filePath = join(tempDir, "check.txt");
    await writeFileIfNotExists(filePath, "content");
    await expect(access(filePath)).resolves.toBeUndefined();
  });
});
