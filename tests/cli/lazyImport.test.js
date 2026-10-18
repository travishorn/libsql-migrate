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

// Only getConfig is mocked. getMigrations, getSeeds and the commands are real,
// so these tests exercise the actual import of migration and seed files.
vi.mock("../../src/lib/getConfig.js", async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock("../../src/lib/logger.js", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import getConfig from "../../src/lib/getConfig.js";
import latest from "../../src/cli/latest.js";
import rollback from "../../src/cli/rollback.js";
import seedRun from "../../src/cli/seedRun.js";

// A file that cannot be imported. If a command still succeeds, the file was
// never loaded.
const unimportable = `
import "package-that-does-not-exist";
export async function up() {}
export async function down() {}
export async function seed() {}
`;

// A file whose functions record their execution through the client.
const tracing = (name) => `
export async function up(client) { await client.execute("UP ${name}"); }
export async function down(client) { await client.execute("DOWN ${name}"); }
export async function seed(client) { await client.execute("SEED ${name}"); }
`;

const sqlOf = (statement) =>
  typeof statement === "string" ? statement : statement.sql;

// Ordered "UP …", "DOWN …" or "SEED …" markers recorded by the tracing files.
const traced = (prefix) =>
  mockExecute.mock.calls
    .map((call) => sqlOf(call[0]))
    .filter((sql) => sql.startsWith(prefix));

// Positional args of the libsql_migrate INSERTs or DELETEs, in order.
const recorded = (statement) =>
  mockExecute.mock.calls
    .filter((call) => sqlOf(call[0]).includes(`${statement} libsql_migrate`))
    .map((call) => call[0].args);

const record = (name, batch) => ({
  name,
  batch,
  migratedAt: `2024-01-0${batch}T00:00:00`,
});

describe("lazy import of migration and seed files", () => {
  let tempDir;
  let migrationsDir;
  let seedsDir;
  let records;

  const write = (dir, name, body) =>
    writeFile(join(dir, `${name}.js`), body, "utf-8");

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-lazy-"));
    migrationsDir = join(tempDir, "migrations");
    seedsDir = join(tempDir, "seeds");
    await mkdir(migrationsDir);
    await mkdir(seedsDir);
    records = [];

    vi.clearAllMocks();

    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relative(process.cwd(), migrationsDir) },
      seeds: { directory: relative(process.cwd(), seedsDir) },
    });

    mockExecute.mockImplementation((statement) =>
      Promise.resolve({
        rows: sqlOf(statement).includes("SELECT") ? records : [],
      }),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("latest does not import migrations that are already applied", async () => {
    await write(migrationsDir, "001_applied", unimportable);
    await write(migrationsDir, "002_pending", tracing("002_pending"));
    records = [record("001_applied", 1)];

    await latest();

    expect(traced("UP")).toEqual(["UP 002_pending"]);
    expect(recorded("INSERT INTO")).toEqual([["002_pending", 2]]);
  });

  it("latest does not import anything when the schema is up-to-date", async () => {
    await write(migrationsDir, "001_applied", unimportable);
    records = [record("001_applied", 1)];

    await latest();

    expect(traced("UP")).toEqual([]);
    expect(recorded("INSERT INTO")).toEqual([]);
  });

  it("latest runs pending migrations in order with the next batch number", async () => {
    await write(migrationsDir, "001_a", tracing("001_a"));
    await write(migrationsDir, "002_b", tracing("002_b"));
    await write(migrationsDir, "003_c", tracing("003_c"));
    records = [record("001_a", 1)];

    await latest();

    expect(traced("UP")).toEqual(["UP 002_b", "UP 003_c"]);
    expect(recorded("INSERT INTO")).toEqual([
      ["002_b", 2],
      ["003_c", 2],
    ]);
  });

  it("rollback imports only the migrations of the last batch", async () => {
    await write(migrationsDir, "001_a", unimportable);
    await write(migrationsDir, "002_b", tracing("002_b"));
    await write(migrationsDir, "003_c", tracing("003_c"));
    records = [record("001_a", 1), record("002_b", 2), record("003_c", 2)];

    await rollback();

    expect(traced("DOWN")).toEqual(["DOWN 003_c", "DOWN 002_b"]);
    expect(recorded("DELETE FROM")).toEqual([["003_c"], ["002_b"]]);
  });

  it("seed:run imports only the selected seeds", async () => {
    await write(seedsDir, "bad", unimportable);
    await write(seedsDir, "good", tracing("good"));

    await seedRun(["good"]);

    expect(traced("SEED")).toEqual(["SEED good"]);
  });

  it("reports an import error of a pending migration like a failing up()", async () => {
    await write(migrationsDir, "001_broken", unimportable);
    const onError = vi.fn();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: relative(process.cwd(), migrationsDir) },
      hooks: { onError },
    });

    await expect(latest()).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith("up", "001_broken", expect.any(Error));
    expect(recorded("INSERT INTO")).toEqual([]);
  });
});
