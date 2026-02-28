import { describe, it, expect } from "vitest";
import getVersion from "../../src/lib/getVersion.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

describe("getVersion", () => {
  it("returns a version string", () => {
    const version = getVersion();
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
  });

  it("returns the version from package.json", async () => {
    const pkgPath = join(
      fileURLToPath(new URL(".", import.meta.url)),
      "../../package.json",
    );
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    expect(getVersion()).toBe(pkg.version);
  });

  it("version matches semver pattern", () => {
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
