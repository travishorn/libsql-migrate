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

import latest from "../../src/cli/latest.js";
import { getMigrations, getConfig, logger } from "../../src/lib/index.js";

function makeMigration(name, batch) {
  return {
    name,
    path: `/migrations/${name}.js`,
    up: vi.fn().mockResolvedValue(undefined),
    down: vi.fn().mockResolvedValue(undefined),
    ...(batch !== undefined ? { batch, migratedAt: new Date() } : {}),
  };
}

describe("latest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./migrations" },
    });
  });

  it("logs up-to-date message when there are no pending migrations", async () => {
    getMigrations.mockResolvedValue({ pending: null, completed: null });

    await latest();

    expect(logger.info).toHaveBeenCalledWith("Database schema is up-to-date.");
  });

  it("runs all pending migrations", async () => {
    const m1 = makeMigration("20240101000000_first");
    const m2 = makeMigration("20240102000000_second");
    getMigrations.mockResolvedValue({
      pending: [m1, m2],
      completed: null,
    });

    await latest();

    expect(m1.up).toHaveBeenCalledWith(expect.any(Object));
    expect(m2.up).toHaveBeenCalledWith(expect.any(Object));
  });

  it("inserts all migrations with the same batch number", async () => {
    const m1 = makeMigration("20240101000000_first");
    const m2 = makeMigration("20240102000000_second");
    getMigrations.mockResolvedValue({
      pending: [m1, m2],
      completed: null,
    });

    await latest();

    const insertCalls = mockExecute.mock.calls.filter((call) => {
      const arg = call[0];
      const sql = typeof arg === "string" ? arg : arg?.sql ?? "";
      return sql.includes("INSERT INTO libsql_migrate");
    });
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0][0].args.batch).toBe(1);
    expect(insertCalls[1][0].args.batch).toBe(1);
  });

  it("uses batch number incremented from last completed migration", async () => {
    const completed = makeMigration("20240101000000_old", 3);
    const pending = makeMigration("20240102000000_new");
    getMigrations.mockResolvedValue({
      pending: [pending],
      completed: [completed],
    });

    await latest();

    const insertCall = mockExecute.mock.calls.find((call) => {
      const arg = call[0];
      const sql = typeof arg === "string" ? arg : arg?.sql ?? "";
      return sql.includes("INSERT INTO libsql_migrate");
    });
    expect(insertCall[0].args.batch).toBe(4);
  });

  it("logs count and names of all migrations run", async () => {
    const m1 = makeMigration("20240101000000_first");
    const m2 = makeMigration("20240102000000_second");
    getMigrations.mockResolvedValue({
      pending: [m1, m2],
      completed: null,
    });

    await latest();

    expect(logger.info).toHaveBeenCalledWith(
      "Ran 2 migrations: 20240101000000_first, 20240102000000_second.",
    );
  });

  it("logs singular form when only one migration runs", async () => {
    const m = makeMigration("20240101000000_first");
    getMigrations.mockResolvedValue({ pending: [m], completed: null });

    await latest();

    expect(logger.info).toHaveBeenCalledWith(
      "Ran 1 migration: 20240101000000_first.",
    );
  });

  it("calls beforeMigration hook for each migration", async () => {
    const beforeMigration = vi.fn();
    const m1 = makeMigration("20240101000000_first");
    const m2 = makeMigration("20240102000000_second");
    getMigrations.mockResolvedValue({ pending: [m1, m2], completed: null });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { beforeMigration },
    });

    await latest();

    expect(beforeMigration).toHaveBeenCalledTimes(2);
    expect(beforeMigration).toHaveBeenNthCalledWith(
      1,
      "up",
      "20240101000000_first",
    );
    expect(beforeMigration).toHaveBeenNthCalledWith(
      2,
      "up",
      "20240102000000_second",
    );
  });

  it("calls afterMigrations hook after all migrations run", async () => {
    const afterMigrations = vi.fn();
    const m1 = makeMigration("20240101000000_first");
    const m2 = makeMigration("20240102000000_second");
    getMigrations.mockResolvedValue({ pending: [m1, m2], completed: null });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { afterMigrations },
    });

    await latest();

    expect(afterMigrations).toHaveBeenCalledOnce();
    expect(afterMigrations).toHaveBeenCalledWith(
      "up",
      ["20240101000000_first", "20240102000000_second"],
      [undefined, undefined],
    );
  });

  it("calls onError hook and rethrows when a migration throws", async () => {
    const onError = vi.fn();
    const err = new Error("migration error");
    const m = {
      ...makeMigration("20240101000000_first"),
      up: vi.fn().mockRejectedValue(err),
    };
    getMigrations.mockResolvedValue({ pending: [m], completed: null });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { onError },
    });

    await expect(latest()).rejects.toThrow("migration error");
    expect(onError).toHaveBeenCalledWith("up", "20240101000000_first", err);
  });

  it("stops running migrations after one fails", async () => {
    const err = new Error("migration error");
    const m1 = {
      ...makeMigration("20240101000000_first"),
      up: vi.fn().mockRejectedValue(err),
    };
    const m2 = makeMigration("20240102000000_second");
    getMigrations.mockResolvedValue({ pending: [m1, m2], completed: null });

    await expect(latest()).rejects.toThrow("migration error");
    expect(m2.up).not.toHaveBeenCalled();
  });
});
