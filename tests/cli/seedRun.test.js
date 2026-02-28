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
  getSeeds: vi.fn(),
  getConfig: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import seedRun from "../../src/cli/seedRun.js";
import { getSeeds, getConfig, logger } from "../../src/lib/index.js";

function makeSeed(name) {
  return {
    name,
    path: `/seeds/${name}.js`,
    run: vi.fn().mockResolvedValue(undefined),
  };
}

describe("seedRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      seeds: { directory: "./seeds" },
    });
  });

  it("runs all seeds when no names are specified", async () => {
    const s1 = makeSeed("animals");
    const s2 = makeSeed("users");
    getSeeds.mockResolvedValue([s1, s2]);

    await seedRun([]);

    expect(s1.run).toHaveBeenCalledWith(expect.any(Object));
    expect(s2.run).toHaveBeenCalledWith(expect.any(Object));
  });

  it("runs only specified seeds when names are provided", async () => {
    const s1 = makeSeed("animals");
    const s2 = makeSeed("users");
    getSeeds.mockResolvedValue([s1, s2]);

    await seedRun(["animals"]);

    expect(s1.run).toHaveBeenCalled();
    expect(s2.run).not.toHaveBeenCalled();
  });

  it("logs warning when specified seed name does not exist", async () => {
    const s1 = makeSeed("animals");
    getSeeds.mockResolvedValue([s1]);

    await seedRun(["nonexistent"]);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("nonexistent"),
    );
  });

  it("logs warning with singular form for one missing seed name", async () => {
    getSeeds.mockResolvedValue([makeSeed("animals")]);

    await seedRun(["missing"]);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("No seed exists with name:"),
    );
  });

  it("logs warning with plural form for multiple missing seed names", async () => {
    getSeeds.mockResolvedValue([makeSeed("animals")]);

    await seedRun(["missing1", "missing2"]);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("No seed exists with names:"),
    );
  });

  it("logs count and names of seeds run", async () => {
    const s1 = makeSeed("animals");
    const s2 = makeSeed("users");
    getSeeds.mockResolvedValue([s1, s2]);

    await seedRun([]);

    expect(logger.info).toHaveBeenCalledWith("Ran 2 seeds: animals, users.");
  });

  it("logs singular form when only one seed runs", async () => {
    const s = makeSeed("animals");
    getSeeds.mockResolvedValue([s]);

    await seedRun([]);

    expect(logger.info).toHaveBeenCalledWith("Ran 1 seed: animals.");
  });

  it("calls beforeSeed hook for each seed", async () => {
    const beforeSeed = vi.fn();
    const s = makeSeed("animals");
    getSeeds.mockResolvedValue([s]);
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { beforeSeed },
    });

    await seedRun([]);

    expect(beforeSeed).toHaveBeenCalledWith("animals");
  });

  it("calls afterSeed hook for each seed", async () => {
    const afterSeed = vi.fn();
    const s = makeSeed("animals");
    getSeeds.mockResolvedValue([s]);
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { afterSeed },
    });

    await seedRun([]);

    expect(afterSeed).toHaveBeenCalledWith("animals", undefined);
  });

  it("calls afterSeeds hook after all seeds run", async () => {
    const afterSeeds = vi.fn();
    const s1 = makeSeed("animals");
    const s2 = makeSeed("users");
    getSeeds.mockResolvedValue([s1, s2]);
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { afterSeeds },
    });

    await seedRun([]);

    expect(afterSeeds).toHaveBeenCalledOnce();
    expect(afterSeeds).toHaveBeenCalledWith(
      ["animals", "users"],
      [undefined, undefined],
    );
  });

  it("calls onError hook and rethrows when seed throws", async () => {
    const onError = vi.fn();
    const err = new Error("seed failed");
    const s = { ...makeSeed("animals"), run: vi.fn().mockRejectedValue(err) };
    getSeeds.mockResolvedValue([s]);
    getConfig.mockResolvedValue({
      connection: { url: "file:test.db" },
      hooks: { onError },
    });

    await expect(seedRun([])).rejects.toThrow("seed failed");
    expect(onError).toHaveBeenCalledWith("seed", "animals", err);
  });

  it("runs multiple specified seeds", async () => {
    const s1 = makeSeed("animals");
    const s2 = makeSeed("cars");
    const s3 = makeSeed("users");
    getSeeds.mockResolvedValue([s1, s2, s3]);

    await seedRun(["animals", "cars"]);

    expect(s1.run).toHaveBeenCalled();
    expect(s2.run).toHaveBeenCalled();
    expect(s3.run).not.toHaveBeenCalled();
  });
});
