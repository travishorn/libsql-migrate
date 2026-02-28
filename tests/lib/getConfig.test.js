import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

describe("getConfig", () => {
  let tempDir;
  let configFilePath;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "libsql-migrate-cfg-"));
    configFilePath = join(tempDir, "libsqlrc.js");
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.resetModules();
  });

  async function loadModule() {
    return await import("../../src/lib/getConfig.js");
  }

  function relPath(absPath) {
    // Calculate a relative path from cwd to absPath so setConfigPath works
    return relative(process.cwd(), absPath);
  }

  it("loads configuration for the development environment by default", async () => {
    await writeFile(
      configFilePath,
      `export default { development: { connection: { url: "file:dev.db" } } };`,
      "utf-8",
    );

    const { default: getConfig, setConfigPath } = await loadModule();
    setConfigPath(relPath(configFilePath));

    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      const config = await getConfig();
      expect(config.connection.url).toBe("file:dev.db");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("loads configuration for the production environment when NODE_ENV=production", async () => {
    await writeFile(
      configFilePath,
      `export default { development: { connection: { url: "file:dev.db" } }, production: { connection: { url: "libsql://prod.db", authToken: "tok" } } };`,
      "utf-8",
    );

    const { default: getConfig, setConfigPath } = await loadModule();
    setConfigPath(relPath(configFilePath));

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const config = await getConfig();
      expect(config.connection.url).toBe("libsql://prod.db");
      expect(config.connection.authToken).toBe("tok");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("merges default config values with user-defined config", async () => {
    await writeFile(
      configFilePath,
      `export default { development: { connection: { url: "file:dev.db" } } };`,
      "utf-8",
    );

    const { default: getConfig, setConfigPath } = await loadModule();
    setConfigPath(relPath(configFilePath));

    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      const config = await getConfig();
      // Default migrations directory should be present
      expect(config.migrations.directory).toBe("./migrations");
      // Default seeds directory should be present
      expect(config.seeds.directory).toBe("./seeds");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("user-defined config overrides default config", async () => {
    await writeFile(
      configFilePath,
      `export default { development: { connection: { url: "file:dev.db" }, migrations: { directory: "./custom-migrations" } } };`,
      "utf-8",
    );

    const { default: getConfig, setConfigPath } = await loadModule();
    setConfigPath(relPath(configFilePath));

    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      const config = await getConfig();
      expect(config.migrations.directory).toBe("./custom-migrations");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("setConfigPath updates the config path", async () => {
    const { setConfigPath, getConfigPath } = await loadModule();
    setConfigPath("custom/libsqlrc.js");
    expect(getConfigPath().replace(/\\/g, "/")).toContain("custom/libsqlrc.js");
  });

  it("getConfigPath returns the current config path", async () => {
    const { getConfigPath } = await loadModule();
    expect(typeof getConfigPath()).toBe("string");
    expect(getConfigPath().length).toBeGreaterThan(0);
  });

  it("throws an error when config file does not exist", async () => {
    const { default: getConfig, setConfigPath } = await loadModule();
    setConfigPath(relPath(join(tempDir, "nonexistent.js")));

    await expect(getConfig()).rejects.toThrow();
  });
});
