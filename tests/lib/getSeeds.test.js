import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

vi.mock("../../src/lib/index.js", () => ({
  getConfig: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import getSeeds from "../../src/lib/getSeeds.js";
import { getConfig, logger } from "../../src/lib/index.js";

describe("getSeeds", () => {
  let tempDir;
  let seedsDir;
  let relSeedsDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-seeds-"));
    seedsDir = join(tempDir, "seeds");
    relSeedsDir = relative(process.cwd(), seedsDir);

    vi.clearAllMocks();

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./migrations" },
      seeds: { directory: relSeedsDir },
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("warns and returns undefined when seeds directory does not exist", async () => {
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./migrations" },
      seeds: { directory: "./nonexistent-seeds" },
    });

    const result = await getSeeds();

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("does not exist"),
    );
  });

  it("warns and returns undefined when no seed files are found", async () => {
    await mkdir(seedsDir, { recursive: true });

    const result = await getSeeds();

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("No seed files found"),
    );
  });

  it("returns seeds from the seeds directory", async () => {
    await mkdir(seedsDir, { recursive: true });
    await writeFile(
      join(seedsDir, "users.js"),
      `export async function seed(client) {}`,
      "utf-8",
    );

    const result = await getSeeds();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("users");
  });

  it("imports the seed function from each seed file", async () => {
    await mkdir(seedsDir, { recursive: true });
    await writeFile(
      join(seedsDir, "animals.js"),
      `export async function seed(client) { return "seeded"; }`,
      "utf-8",
    );

    const result = await getSeeds();

    expect(typeof result[0].run).toBe("function");
  });

  it("returns seeds sorted alphabetically by filename", async () => {
    await mkdir(seedsDir, { recursive: true });
    await writeFile(
      join(seedsDir, "zebra.js"),
      `export async function seed(client) {}`,
      "utf-8",
    );
    await writeFile(
      join(seedsDir, "apple.js"),
      `export async function seed(client) {}`,
      "utf-8",
    );
    await writeFile(
      join(seedsDir, "mango.js"),
      `export async function seed(client) {}`,
      "utf-8",
    );

    const result = await getSeeds();

    expect(result[0].name).toBe("apple");
    expect(result[1].name).toBe("mango");
    expect(result[2].name).toBe("zebra");
  });

  it("includes the path to each seed file", async () => {
    await mkdir(seedsDir, { recursive: true });
    await writeFile(
      join(seedsDir, "users.js"),
      `export async function seed(client) {}`,
      "utf-8",
    );

    const result = await getSeeds();

    expect(result[0].path).toContain("users.js");
  });

  it("ignores non-.js files in the seeds directory", async () => {
    await mkdir(seedsDir, { recursive: true });
    await writeFile(
      join(seedsDir, "users.js"),
      `export async function seed(client) {}`,
      "utf-8",
    );
    await writeFile(join(seedsDir, "readme.txt"), "not a seed", "utf-8");
    await writeFile(join(seedsDir, "data.json"), "{}", "utf-8");

    const result = await getSeeds();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("users");
  });
});
