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

import down from "../../src/cli/down.js";
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

describe("down", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      migrations: { directory: "./migrations" },
    });
  });

  it("logs rolled-back-as-far-as-possible message when no completed migrations", async () => {
    getMigrations.mockResolvedValue({ pending: null, completed: null });

    await down();

    expect(logger.info).toHaveBeenCalledWith(
      "Database schema is rolled back as far as possible.",
    );
  });

  it("rolls back the latest completed migration", async () => {
    const migration = makeMigration("20240101000000_create_users", 1);
    getMigrations.mockResolvedValue({
      pending: null,
      completed: [migration],
    });

    await down();

    expect(migration.down).toHaveBeenCalledWith(expect.any(Object));
  });

  it("deletes the migration record from the database", async () => {
    const migration = makeMigration("20240101000000_create_users", 1);
    getMigrations.mockResolvedValue({
      pending: null,
      completed: [migration],
    });

    await down();

    const deleteCall = mockExecute.mock.calls.find((call) => {
      const arg = call[0];
      const sql = typeof arg === "string" ? arg : arg?.sql ?? "";
      return sql.includes("DELETE FROM libsql_migrate");
    });
    expect(deleteCall).toBeDefined();
    expect(deleteCall[0].args.name).toBe("20240101000000_create_users");
  });

  it("logs the rolled back migration name", async () => {
    const migration = makeMigration("20240101000000_create_users", 1);
    getMigrations.mockResolvedValue({
      pending: null,
      completed: [migration],
    });

    await down();

    expect(logger.info).toHaveBeenCalledWith(
      "Rolled back 1 migration: 20240101000000_create_users.",
    );
  });

  it("rolls back the last migration in completed array", async () => {
    const first = makeMigration("20240101000000_first", 1);
    const second = makeMigration("20240102000000_second", 2);
    getMigrations.mockResolvedValue({
      pending: null,
      completed: [first, second],
    });

    await down();

    expect(second.down).toHaveBeenCalled();
    expect(first.down).not.toHaveBeenCalled();
  });

  it("calls beforeMigration hook when defined", async () => {
    const beforeMigration = vi.fn();
    const migration = makeMigration("20240101000000_create_users", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [migration] });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { beforeMigration },
    });

    await down();

    expect(beforeMigration).toHaveBeenCalledWith(
      "down",
      "20240101000000_create_users",
    );
  });

  it("calls afterMigration hook when defined", async () => {
    const afterMigration = vi.fn();
    const migration = makeMigration("20240101000000_create_users", 1);
    getMigrations.mockResolvedValue({ pending: null, completed: [migration] });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { afterMigration },
    });

    await down();

    expect(afterMigration).toHaveBeenCalledWith(
      "down",
      "20240101000000_create_users",
      undefined,
    );
  });

  it("calls onError hook and rethrows when migration down() throws", async () => {
    const onError = vi.fn();
    const err = new Error("rollback failed");
    const migration = {
      ...makeMigration("20240101000000_create_users", 1),
      down: vi.fn().mockRejectedValue(err),
    };
    getMigrations.mockResolvedValue({ pending: null, completed: [migration] });
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { onError },
    });

    await expect(down()).rejects.toThrow("rollback failed");
    expect(onError).toHaveBeenCalledWith(
      "down",
      "20240101000000_create_users",
      err,
    );
  });
});
