import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

vi.mock("../../src/lib/index.js", () => ({
  getConfig: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  timestamp: vi.fn(() => "20240318222530"),
}));

import make from "../../src/cli/make.js";
import { getConfig, logger, timestamp } from "../../src/lib/index.js";

describe("make", () => {
  let tempDir;
  let migrationsDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-make-"));
    migrationsDir = join(tempDir, "migrations");
    const relMigrationsDir = relative(process.cwd(), migrationsDir);

    vi.clearAllMocks();
    timestamp.mockReturnValue("20240318222530");

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: join(tempDir, "seeds") },
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a migration file in the migrations directory", async () => {
    await make("create_users");

    const content = await readFile(
      join(migrationsDir, "20240318222530_create_users.js"),
      "utf-8",
    );
    expect(content).toBeTruthy();
  });

  it("creates migrations directory if it does not exist", async () => {
    await make("create_users");

    const { access } = await import("node:fs/promises");
    await expect(access(migrationsDir)).resolves.toBeUndefined();
  });

  it("filename includes timestamp and provided name", async () => {
    await make("create_posts");

    const content = await readFile(
      join(migrationsDir, "20240318222530_create_posts.js"),
      "utf-8",
    );
    expect(content).toBeTruthy();
  });

  it("generated file contains up() function template", async () => {
    await make("create_users");

    const content = await readFile(
      join(migrationsDir, "20240318222530_create_users.js"),
      "utf-8",
    );
    expect(content).toContain("export async function up(client)");
  });

  it("generated file contains down() function template", async () => {
    await make("create_users");

    const content = await readFile(
      join(migrationsDir, "20240318222530_create_users.js"),
      "utf-8",
    );
    expect(content).toContain("export async function down(client)");
  });

  it("logs success message with correct path", async () => {
    await make("create_users");

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("20240318222530_create_users.js"),
    );
  });

  it("calls onError hook and rethrows when file creation fails", async () => {
    const onError = vi.fn();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "\0invalid\0" }, // Invalid path to force error
      hooks: { onError },
    });

    await expect(make("create_users")).rejects.toThrow();
    expect(onError).toHaveBeenCalledWith(
      "make",
      "create_users",
      expect.any(Error),
    );
  });
});
