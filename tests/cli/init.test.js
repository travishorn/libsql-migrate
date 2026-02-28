import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("../../src/lib/index.js", () => ({
  writeFileIfNotExists: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../src/lib/getConfig.js", () => ({
  getConfigPath: vi.fn(),
  setConfigPath: vi.fn(),
  default: vi.fn(),
}));

import init from "../../src/cli/init.js";
import { writeFileIfNotExists, logger } from "../../src/lib/index.js";
import { getConfigPath } from "../../src/lib/getConfig.js";

import realWriteFileIfNotExists from "../../src/lib/writeFileIfNotExists.js";

describe("init", () => {
  let tempDir;
  let configFilePath;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-init-"));
    configFilePath = join(tempDir, "libsqlrc.js");

    vi.clearAllMocks();

    getConfigPath.mockReturnValue(configFilePath);
    writeFileIfNotExists.mockImplementation(realWriteFileIfNotExists);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a configuration file at the config path", async () => {
    await init();

    const content = await readFile(configFilePath, "utf-8");
    expect(content).toBeTruthy();
  });

  it("template contains development configuration", async () => {
    await init();

    const content = await readFile(configFilePath, "utf-8");
    expect(content).toContain("development");
  });

  it("template contains production configuration", async () => {
    await init();

    const content = await readFile(configFilePath, "utf-8");
    expect(content).toContain("production");
  });

  it("template contains libsql connection structure", async () => {
    await init();

    const content = await readFile(configFilePath, "utf-8");
    expect(content).toContain("connection");
    expect(content).toContain("url");
  });

  it("template contains file:local.db for development", async () => {
    await init();

    const content = await readFile(configFilePath, "utf-8");
    expect(content).toContain("file:local.db");
  });

  it("logs success message with the config file path", async () => {
    await init();

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(configFilePath),
    );
  });

  it("throws when the config file already exists", async () => {
    await init();

    // Second call should throw because file already exists
    await expect(init()).rejects.toThrow("already exists");
  });
});
