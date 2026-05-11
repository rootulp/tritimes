import { describe, it, expect } from "vitest";
import { formatPercentile } from "../percentile";

describe("formatPercentile", () => {
  it("formats a normal percentile with a percent sign", () => {
    expect(formatPercentile(22)).toBe("22%");
    expect(formatPercentile(1)).toBe("1%");
    expect(formatPercentile(99)).toBe("99%");
    expect(formatPercentile(100)).toBe("100%");
  });

  it("renders an em-dash for 0 (treated as no data)", () => {
    expect(formatPercentile(0)).toBe("—");
  });

  it("renders an em-dash for negative or NaN", () => {
    expect(formatPercentile(-5)).toBe("—");
    expect(formatPercentile(Number.NaN)).toBe("—");
  });
});
