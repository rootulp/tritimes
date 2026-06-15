import { describe, it, expect } from "vitest";
import { formatPercentile } from "../percentile";

describe("formatPercentile", () => {
  it("formats a normal percentile with a percent sign", () => {
    expect(formatPercentile(22)).toBe("22%");
    expect(formatPercentile(1)).toBe("1%");
    expect(formatPercentile(99)).toBe("99%");
    expect(formatPercentile(88)).toBe("88%");
  });

  it("rounds fractional percentiles", () => {
    expect(formatPercentile(87.6)).toBe("88%");
    expect(formatPercentile(88.4)).toBe("88%");
  });

  it("caps the winner at >99% instead of an impossible 100%", () => {
    // e.g. Hamburg winner: beat 2177 of 2178 = 99.954% — must not round to 100%
    expect(formatPercentile((2177 / 2178) * 100)).toBe(">99%");
    expect(formatPercentile(99.6)).toBe(">99%");
    expect(formatPercentile(100)).toBe(">99%");
  });

  it("shows <1% at the bottom end instead of 0%", () => {
    // e.g. second-to-last: beat 1 of 300 = 0.33% — must not round to 0%
    expect(formatPercentile((1 / 300) * 100)).toBe("<1%");
    expect(formatPercentile(0.4)).toBe("<1%");
  });

  it("does not cap values that round inside 1-99", () => {
    expect(formatPercentile(99.4)).toBe("99%");
    expect(formatPercentile(0.5)).toBe("1%");
  });

  it("renders an em-dash for 0 (treated as no data)", () => {
    expect(formatPercentile(0)).toBe("—");
  });

  it("renders an em-dash for negative, NaN, or Infinity", () => {
    expect(formatPercentile(-5)).toBe("—");
    expect(formatPercentile(Number.NaN)).toBe("—");
    expect(formatPercentile(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatPercentile(Number.NEGATIVE_INFINITY)).toBe("—");
  });
});
