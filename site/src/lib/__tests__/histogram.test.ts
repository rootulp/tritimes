import { describe, it, expect } from "vitest";
import {
  deriveAgeBand,
  filterSegment,
  computeRaceHistogram,
  computeMedian,
} from "../histogram";

describe("deriveAgeBand", () => {
  it("strips a leading M", () => expect(deriveAgeBand("M35-39")).toBe("35-39"));
  it("strips a leading F", () => expect(deriveAgeBand("F35-39")).toBe("35-39"));
  it("strips M from PRO", () => expect(deriveAgeBand("MPRO")).toBe("PRO"));
  it("strips F from PRO", () => expect(deriveAgeBand("FPRO")).toBe("PRO"));
  it("passes through non-matching values", () =>
    expect(deriveAgeBand("Hamad tawom3")).toBe("Hamad tawom3"));
  it("passes through empty string", () => expect(deriveAgeBand("")).toBe(""));
});

describe("filterSegment", () => {
  // gender: 0=Male, 1=Female; band: 0="18-24", 1="25-29"
  const data = {
    genderIdx: [0, 0, 1, 1],
    ageBandIdx: [0, 1, 0, 1],
  };
  it("returns all indices when both are 'any' (-1)", () =>
    expect(filterSegment(data, -1, -1)).toEqual([0, 1, 2, 3]));
  it("filters by gender only", () =>
    expect(filterSegment(data, 1, -1)).toEqual([2, 3]));
  it("filters by age band only", () =>
    expect(filterSegment(data, -1, 0)).toEqual([0, 2]));
  it("filters by both", () =>
    expect(filterSegment(data, 0, 1)).toEqual([1]));
  it("returns empty for a combination with no members", () => {
    const single = { genderIdx: [0], ageBandIdx: [0] };
    expect(filterSegment(single, 1, 0)).toEqual([]);
  });
});

describe("computeRaceHistogram (unchanged after extraction)", () => {
  it("bins values and computes median + total", () => {
    // Three 5-min-binnable swim-like values with binSize 300.
    const result = computeRaceHistogram([300, 350, 620], 300);
    expect(result.totalAthletes).toBe(3);
    expect(result.medianSeconds).toBe(350);
    // 300..600 has 2 (300,350); 600..900 has 1 (620)
    const counts = result.bins.map((b) => b.count);
    expect(counts).toEqual([2, 1]);
  });
  it("ignores zero/negative values", () => {
    expect(computeRaceHistogram([0, -1], 300)).toEqual({
      bins: [],
      medianSeconds: 0,
      totalAthletes: 0,
    });
  });
  it("computeMedian averages the middle two for even counts", () =>
    expect(computeMedian([10, 20, 30, 40])).toBe(25));
});
