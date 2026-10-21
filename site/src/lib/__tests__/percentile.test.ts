import { describe, it, expect } from "vitest";
import { formatTopPercent } from "../percentile";

describe("formatTopPercent", () => {
  it("converts share-beaten into the rank-from-top convention", () => {
    // Beat 37% of the field => 63% finished ahead => Top 63%.
    expect(formatTopPercent(37)).toBe("Top 63%");
    expect(formatTopPercent(50)).toBe("Top 50%");
    expect(formatTopPercent(71)).toBe("Top 29%");
  });

  it("rounds fractional values", () => {
    expect(formatTopPercent(37.4)).toBe("Top 63%");
    expect(formatTopPercent(37.6)).toBe("Top 62%");
  });

  it("clamps the winner to Top 1% instead of Top 0%", () => {
    // Hamburg winner: beat 2177 of 2178 = 99.954% => Top 0.05% => clamp to Top 1%.
    expect(formatTopPercent((2177 / 2178) * 100)).toBe("Top 1%");
    expect(formatTopPercent(99.6)).toBe("Top 1%");
    expect(formatTopPercent(100)).toBe("Top 1%");
  });

  it("clamps a near-last finisher to Top 99% instead of Top 100%", () => {
    // Second-to-last: beat 1 of 300 = 0.33% => Top 99.67% => clamp to Top 99%.
    expect(formatTopPercent((1 / 300) * 100)).toBe("Top 99%");
    expect(formatTopPercent(0.4)).toBe("Top 99%");
  });

  it("renders an em-dash for 0 (treated as no data)", () => {
    expect(formatTopPercent(0)).toBe("—");
  });

  it("renders an em-dash for negative, NaN, or Infinity", () => {
    expect(formatTopPercent(-5)).toBe("—");
    expect(formatTopPercent(Number.NaN)).toBe("—");
    expect(formatTopPercent(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatTopPercent(Number.NEGATIVE_INFINITY)).toBe("—");
  });
});
