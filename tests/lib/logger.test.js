import { describe, it, expect } from "vitest";
import logger from "../../src/lib/logger.js";

describe("logger", () => {
  it("exports a logger instance", () => {
    expect(logger).toBeDefined();
  });

  it("has an info method", () => {
    expect(typeof logger.info).toBe("function");
  });

  it("has a warn method", () => {
    expect(typeof logger.warn).toBe("function");
  });

  it("has an error method", () => {
    expect(typeof logger.error).toBe("function");
  });

  it("has a debug method", () => {
    expect(typeof logger.debug).toBe("function");
  });

  it("has the info log level configured", () => {
    expect(logger.level).toBe("info");
  });
});
