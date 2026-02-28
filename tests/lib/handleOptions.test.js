import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getConfig module before importing handleOptions
vi.mock("../../src/lib/getConfig.js", () => ({
  setConfigPath: vi.fn(),
  getConfigPath: vi.fn(() => "libsqlrc.js"),
  default: vi.fn(),
}));

import handleOptions from "../../src/lib/handleOptions.js";
import { setConfigPath } from "../../src/lib/getConfig.js";

describe("handleOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls setConfigPath when --config option is provided", () => {
    const command = { opts: () => ({ config: "custom/path.js" }) };
    handleOptions(command);
    expect(setConfigPath).toHaveBeenCalledWith("custom/path.js");
  });

  it("does not call setConfigPath when --config option is not provided", () => {
    const command = { opts: () => ({}) };
    handleOptions(command);
    expect(setConfigPath).not.toHaveBeenCalled();
  });

  it("does not throw when command has no options", () => {
    const command = { opts: () => ({}) };
    expect(() => handleOptions(command)).not.toThrow();
  });

  it("does not call setConfigPath when config option is falsy", () => {
    const command = { opts: () => ({ config: "" }) };
    handleOptions(command);
    expect(setConfigPath).not.toHaveBeenCalled();
  });
});
