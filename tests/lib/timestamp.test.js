import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import timestamp from "../../src/lib/timestamp.js";

describe("timestamp", () => {
  beforeEach(() => {
    // Freeze time to a known UTC value: 2024-03-18T22:25:30Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-18T22:25:30Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a string in YYYYMMDDhhmmss format", () => {
    const result = timestamp();
    expect(result).toMatch(/^\d{14}$/);
  });

  it("returns the correct UTC date and time", () => {
    const result = timestamp();
    expect(result).toBe("20240318222530");
  });

  it("pads month, day, hour, minute, second with leading zeros", () => {
    vi.setSystemTime(new Date("2024-01-05T03:07:09Z"));
    const result = timestamp();
    expect(result).toBe("20240105030709");
  });
});
