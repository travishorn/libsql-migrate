import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const { mockExecute, mockCreateClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockCreateClient = vi.fn(() => ({ execute: mockExecute }));
  return { mockExecute, mockCreateClient };
});

vi.mock("@libsql/client", () => ({
  createClient: mockCreateClient,
}));

// Mock the lib/index.js to control getConfig and logger
vi.mock("../../src/lib/index.js", () => ({
  getConfig: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import getMigrations from "../../src/lib/getMigrations.js";
import { getConfig, logger } from "../../src/lib/index.js";

describe("getMigrations", () => {
  let tempDir;
  let migrationsDir;
  let relMigrationsDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-mig-"));
    migrationsDir = join(tempDir, "migrations");
    relMigrationsDir = relative(process.cwd(), migrationsDir);

    vi.clearAllMocks();

    // Default mock config
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./migrations" },
      seeds: { directory: "./seeds" },
    });

    // Default: table create succeeds, no existing records
    mockExecute.mockImplementation((sql) => {
      const query = typeof sql === "string" ? sql : sql.sql ?? sql;
      if (
        typeof query === "string" &&
        query.includes("CREATE TABLE IF NOT EXISTS")
      ) {
        return Promise.resolve({ rows: [] });
      }
      if (typeof query === "string" && query.includes("SELECT")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("warns and returns undefined when migrations directory does not exist", async () => {
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./nonexistent-migrations" },
      seeds: { directory: "./seeds" },
    });

    const result = await getMigrations();

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("does not exist"),
    );
  });

  it("warns and returns undefined when no migration files are found", async () => {
    await mkdir(migrationsDir, { recursive: true });

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: "./seeds" },
    });

    const result = await getMigrations();

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("No migration files found"),
    );
  });

  it("returns pending migrations when no records exist in the database", async () => {
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(
      join(migrationsDir, "20240101000000_create_users.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: "./seeds" },
    });

    const result = await getMigrations();

    expect(result).toBeDefined();
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0].name).toBe("20240101000000_create_users");
    expect(result.completed).toBeNull();
  });

  it("returns completed migrations when database records exist", async () => {
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(
      join(migrationsDir, "20240101000000_create_users.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );
    await writeFile(
      join(migrationsDir, "20240102000000_create_posts.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: "./seeds" },
    });

    // First migration is completed
    mockExecute.mockImplementation((sql) => {
      const query = typeof sql === "string" ? sql : sql.sql ?? sql;
      if (
        typeof query === "string" &&
        query.includes("CREATE TABLE IF NOT EXISTS")
      ) {
        return Promise.resolve({ rows: [] });
      }
      if (typeof query === "string" && query.includes("SELECT")) {
        return Promise.resolve({
          rows: [
            {
              name: "20240101000000_create_users",
              batch: 1,
              migratedAt: "2024-01-01T00:00:00",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await getMigrations();

    expect(result).toBeDefined();
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].name).toBe("20240101000000_create_users");
    expect(result.completed[0].batch).toBe(1);
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0].name).toBe("20240102000000_create_posts");
  });

  it("imports up and down functions from migration files", async () => {
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(
      join(migrationsDir, "20240101000000_create_users.js"),
      `export async function up(client) { return "up-result"; } export async function down(client) { return "down-result"; }`,
      "utf-8",
    );

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: "./seeds" },
    });

    const result = await getMigrations();

    expect(typeof result.pending[0].up).toBe("function");
    expect(typeof result.pending[0].down).toBe("function");
  });

  it("sorts migration files alphabetically by filename", async () => {
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(
      join(migrationsDir, "20240103000000_third.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );
    await writeFile(
      join(migrationsDir, "20240101000000_first.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );
    await writeFile(
      join(migrationsDir, "20240102000000_second.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: "./seeds" },
    });

    const result = await getMigrations();

    expect(result.pending[0].name).toBe("20240101000000_first");
    expect(result.pending[1].name).toBe("20240102000000_second");
    expect(result.pending[2].name).toBe("20240103000000_third");
  });

  it("creates the libsql_migrate table on first run", async () => {
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(
      join(migrationsDir, "20240101000000_create_users.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: "./seeds" },
    });

    await getMigrations();

    const createTableCall = mockExecute.mock.calls.find((call) => {
      const arg = call[0];
      const sql = typeof arg === "string" ? arg : arg?.sql ?? arg;
      return (
        typeof sql === "string" && sql.includes("CREATE TABLE IF NOT EXISTS")
      );
    });

    expect(createTableCall).toBeDefined();
  });

  it("returns null for pending when all migrations are completed", async () => {
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(
      join(migrationsDir, "20240101000000_create_users.js"),
      `export async function up(client) {} export async function down(client) {}`,
      "utf-8",
    );

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relMigrationsDir },
      seeds: { directory: "./seeds" },
    });

    mockExecute.mockImplementation((sql) => {
      const query = typeof sql === "string" ? sql : sql.sql ?? sql;
      if (
        typeof query === "string" &&
        query.includes("CREATE TABLE IF NOT EXISTS")
      ) {
        return Promise.resolve({ rows: [] });
      }
      if (typeof query === "string" && query.includes("SELECT")) {
        return Promise.resolve({
          rows: [
            {
              name: "20240101000000_create_users",
              batch: 1,
              migratedAt: "2024-01-01T00:00:00",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await getMigrations();

    expect(result.pending).toBeNull();
    expect(result.completed).toHaveLength(1);
  });
});
