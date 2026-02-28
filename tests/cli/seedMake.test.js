import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

vi.mock("../../src/lib/index.js", () => ({
  getConfig: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  writeFileIfNotExists: vi.fn(),
}));

// Import the real writeFileIfNotExists after mock is set up
import seedMake from "../../src/cli/seedMake.js";
import {
  getConfig,
  logger,
  writeFileIfNotExists,
} from "../../src/lib/index.js";

// Use the real implementation for writeFileIfNotExists
import realWriteFileIfNotExists from "../../src/lib/writeFileIfNotExists.js";

describe("seedMake", () => {
  let tempDir;
  let seedsDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-seedmake-"));
    seedsDir = join(tempDir, "seeds");
    const relSeedsDir = relative(process.cwd(), seedsDir);

    vi.clearAllMocks();

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: join(tempDir, "migrations") },
      seeds: { directory: relSeedsDir },
    });

    // Use real implementation for writeFileIfNotExists
    writeFileIfNotExists.mockImplementation(realWriteFileIfNotExists);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a seed file in the seeds directory", async () => {
    await seedMake("users");

    const content = await readFile(join(seedsDir, "users.js"), "utf-8");
    expect(content).toBeTruthy();
  });

  it("creates seeds directory if it does not exist", async () => {
    await seedMake("users");

    const { access } = await import("node:fs/promises");
    await expect(access(seedsDir)).resolves.toBeUndefined();
  });

  it("filename uses provided name without timestamp", async () => {
    await seedMake("animals");

    const content = await readFile(join(seedsDir, "animals.js"), "utf-8");
    expect(content).toBeTruthy();
  });

  it("generated file contains seed() function template", async () => {
    await seedMake("users");

    const content = await readFile(join(seedsDir, "users.js"), "utf-8");
    expect(content).toContain("export async function seed(client)");
  });

  it("logs success message with correct path", async () => {
    await seedMake("users");

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("users.js"),
    );
  });

  it("throws and calls onError when seed file already exists", async () => {
    const onError = vi.fn();
    const relSeedsDir = relative(process.cwd(), seedsDir);
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      seeds: { directory: relSeedsDir },
      hooks: { onError },
    });

    await seedMake("users");

    // Second call should fail
    await expect(seedMake("users")).rejects.toThrow();
    expect(onError).toHaveBeenCalledWith(
      "seed:make",
      "users",
      expect.any(Error),
    );
  });

  it("calls onError hook and rethrows when directory creation fails", async () => {
    const onError = vi.fn();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      seeds: { directory: "\0invalid\0" },
      hooks: { onError },
    });

    await expect(seedMake("users")).rejects.toThrow();
    expect(onError).toHaveBeenCalledWith(
      "seed:make",
      "users",
      expect.any(Error),
    );
  });
});
