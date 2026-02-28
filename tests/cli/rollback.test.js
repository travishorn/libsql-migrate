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

import rollback from "../../src/cli/rollback.js";
import { getMigrations, getConfig, logger } from "../../src/lib/index.js";

function makeMigration(name, batch = 1) {
  return {
    name,
    path: `/migrations/${name}.js`,
    up: vi.fn().mockResolvedValue(undefined),
    down: vi.fn().mockResolvedValue(undefined),
    batch,
    migratedAt: new Date(),
  };
}

describe("rollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./migrations" },
    });
  });

  it("logs rolled-back-as-far-as-possible when no completed migrations", async () => {
    getMigrations.mockResolvedValue({ pending: null, completed: null });

    await rollback();

    expect(logger.info).toHaveBeenCalledWith(
      "Database schema is rolled back as far as possible.",
    );
  });

  it("rolls back all migrations in the latest batch", async () => {
    const m1 = makeMigration("20240101000000_first", 1);
    const m2 = makeMigration("20240102000000_second", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [m1, m2] });

    await rollback();

    expect(m1.down).toHaveBeenCalled();
    expect(m2.down).toHaveBeenCalled();
  });

  it("does not roll back migrations from earlier batches", async () => {
    const m1 = makeMigration("20240101000000_first", 1);
    const m2 = makeMigration("20240102000000_second", 2);
    getMigrations.mockResolvedValue({ pending: null, completed: [m1, m2] });

    await rollback();

    expect(m2.down).toHaveBeenCalled();
    expect(m1.down).not.toHaveBeenCalled();
  });

  it("rolls back migrations in reverse order", async () => {
    const order = [];
    const m1 = {
      ...makeMigration("20240101000000_first", 1),
      down: vi.fn().mockImplementation(() => {
        order.push("first");
        return Promise.resolve();
      }),
    };
    const m2 = {
      ...makeMigration("20240102000000_second", 1),
      down: vi.fn().mockImplementation(() => {
        order.push("second");
        return Promise.resolve();
      }),
    };
    getMigrations.mockResolvedValue({ pending: null, completed: [m1, m2] });

    await rollback();

    expect(order).toEqual(["second", "first"]);
  });

  it("deletes each rolled back migration from the database", async () => {
    const m1 = makeMigration("20240101000000_first", 1);
    const m2 = makeMigration("20240102000000_second", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [m1, m2] });

    await rollback();

    const deleteCalls = mockExecute.mock.calls.filter((call) => {
      const arg = call[0];
      const sql = typeof arg === "string" ? arg : arg?.sql ?? "";
      return sql.includes("DELETE FROM libsql_migrate");
    });
    expect(deleteCalls).toHaveLength(2);
  });

  it("logs count and names of rolled back migrations", async () => {
    const m1 = makeMigration("20240101000000_first", 1);
    const m2 = makeMigration("20240102000000_second", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [m1, m2] });

    await rollback();

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/Rolled back 2 migrations:/),
    );
  });

  it("logs singular form when only one migration is rolled back", async () => {
    const m = makeMigration("20240101000000_first", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [m] });

    await rollback();

    expect(logger.info).toHaveBeenCalledWith(
      "Rolled back 1 migration: 20240101000000_first.",
    );
  });

  it("calls beforeMigration hook for each rolled back migration", async () => {
    const beforeMigration = vi.fn();
    const m1 = makeMigration("20240101000000_first", 1);
    const m2 = makeMigration("20240102000000_second", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [m1, m2] });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { beforeMigration },
    });

    await rollback();

    expect(beforeMigration).toHaveBeenCalledTimes(2);
    expect(beforeMigration).toHaveBeenCalledWith("down", expect.any(String));
  });

  it("calls afterMigrations hook after all rollbacks", async () => {
    const afterMigrations = vi.fn();
    const m = makeMigration("20240101000000_first", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [m] });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { afterMigrations },
    });

    await rollback();

    expect(afterMigrations).toHaveBeenCalledOnce();
    expect(afterMigrations).toHaveBeenCalledWith(
      "down",
      ["20240101000000_first"],
      [undefined],
    );
  });

  it("calls onError hook and rethrows when a migration down() throws", async () => {
    const onError = vi.fn();
    const err = new Error("rollback error");
    const m = {
      ...makeMigration("20240101000000_first", 1),
      down: vi.fn().mockRejectedValue(err),
    };
    getMigrations.mockResolvedValue({ pending: null, completed: [m] });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { onError },
    });

    await expect(rollback()).rejects.toThrow("rollback error");
    expect(onError).toHaveBeenCalledWith("down", "20240101000000_first", err);
  });
});
