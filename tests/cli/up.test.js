import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockExecute, mockCreateClient } = vi.hoisted(() => {
  const mockExecute = vi.fn().mockResolvedValue({ rows: [] });
  const mockCreateClient = vi.fn(() => ({ execute: mockExecute }));
  return { mockExecute, mockCreateClient };
});

vi.mock("@libsql/client", () => ({
  createClient: mockCreateClient,
}));

vi.mock("../../src/lib/index.js", () => ({
  getMigrations: vi.fn(),
  getConfig: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import up from "../../src/cli/up.js";
import { getMigrations, getConfig, logger } from "../../src/lib/index.js";

const makeUpFn = vi.fn().mockResolvedValue(undefined);
const makeDownFn = vi.fn().mockResolvedValue(undefined);

function makeMigration(name, batch) {
  return {
    name,
    path: `/migrations/${name}.js`,
    up: makeUpFn,
    down: makeDownFn,
    ...(batch !== undefined ? { batch, migratedAt: new Date() } : {}),
  };
}

describe("up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./migrations" },
    });
  });

  it("logs up-to-date message when there are no pending migrations", async () => {
    getMigrations.mockResolvedValue({ pending: null, completed: null });

    await up();

    expect(logger.info).toHaveBeenCalledWith("Database schema is up-to-date.");
  });

  it("runs the first pending migration", async () => {
    const migration = makeMigration("20240101000000_create_users");
    getMigrations.mockResolvedValue({
      pending: [migration],
      completed: null,
    });

    await up();

    expect(makeUpFn).toHaveBeenCalledWith(expect.any(Object));
  });

  it("inserts a record into the database with batch 1 when no completed migrations", async () => {
    const migration = makeMigration("20240101000000_create_users");
    getMigrations.mockResolvedValue({
      pending: [migration],
      completed: null,
    });

    await up();

    const insertCall = mockExecute.mock.calls.find((call) => {
      const arg = call[0];
      const sql = typeof arg === "string" ? arg : arg?.sql ?? "";
      return sql.includes("INSERT INTO libsql_migrate");
    });
    expect(insertCall).toBeDefined();
    expect(insertCall[0].args.batch).toBe(1);
  });

  it("uses batch number incremented from the last completed migration", async () => {
    const completed = makeMigration("20240101000000_first", 2);
    const pending = makeMigration("20240102000000_second");
    getMigrations.mockResolvedValue({
      pending: [pending],
      completed: [completed],
    });

    await up();

    const insertCall = mockExecute.mock.calls.find((call) => {
      const arg = call[0];
      const sql = typeof arg === "string" ? arg : arg?.sql ?? "";
      return sql.includes("INSERT INTO libsql_migrate");
    });
    expect(insertCall[0].args.batch).toBe(3);
  });

  it("logs the migration name after running", async () => {
    const migration = makeMigration("20240101000000_create_users");
    getMigrations.mockResolvedValue({
      pending: [migration],
      completed: null,
    });

    await up();

    expect(logger.info).toHaveBeenCalledWith(
      "Ran 1 migration: 20240101000000_create_users.",
    );
  });

  it("calls beforeMigration hook when defined", async () => {
    const beforeMigration = vi.fn();
    const migration = makeMigration("20240101000000_create_users");
    getMigrations.mockResolvedValue({ pending: [migration], completed: null });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { beforeMigration },
    });

    await up();

    expect(beforeMigration).toHaveBeenCalledWith(
      "up",
      "20240101000000_create_users",
    );
  });

  it("calls afterMigration hook when defined", async () => {
    const afterMigration = vi.fn();
    const migration = makeMigration("20240101000000_create_users");
    getMigrations.mockResolvedValue({ pending: [migration], completed: null });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { afterMigration },
    });

    await up();

    expect(afterMigration).toHaveBeenCalledWith(
      "up",
      "20240101000000_create_users",
      undefined,
    );
  });

  it("calls onError hook and rethrows when migration up() throws", async () => {
    const onError = vi.fn();
    const err = new Error("migration failed");
    const migration = {
      ...makeMigration("20240101000000_create_users"),
      up: vi.fn().mockRejectedValue(err),
    };
    getMigrations.mockResolvedValue({ pending: [migration], completed: null });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { onError },
    });

    await expect(up()).rejects.toThrow("migration failed");
    expect(onError).toHaveBeenCalledWith(
      "up",
      "20240101000000_create_users",
      err,
    );
  });

  it("rethrows error when migration up() throws and no onError hook", async () => {
    const err = new Error("migration failed");
    const migration = {
      ...makeMigration("20240101000000_create_users"),
      up: vi.fn().mockRejectedValue(err),
    };
    getMigrations.mockResolvedValue({ pending: [migration], completed: null });

    await expect(up()).rejects.toThrow("migration failed");
  });
});
