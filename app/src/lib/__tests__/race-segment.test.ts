import { describe, it, expect } from "vitest";
import { getRaceSegmentData } from "../data";

describe("getRaceSegmentData", () => {
  const data = getRaceSegmentData("im703-swansea-2026");

  it("returns equal-length parallel arrays", () => {
    const n = data.swim.length;
    expect(n).toBeGreaterThan(0);
    expect(data.bike.length).toBe(n);
    expect(data.run.length).toBe(n);
    expect(data.finish.length).toBe(n);
    expect(data.genderIdx.length).toBe(n);
    expect(data.ageBandIdx.length).toBe(n);
  });

  it("has index values within their label tables", () => {
    // -1 is a valid sentinel for finishers whose raw gender/ageGroup was
    // blank (excluded from the label tables by design — see
    // getRaceSegmentData's note on unmapped entries). im703-swansea-2026
    // has 14 such finishers with blank gender, so -1 is expected here.
    expect(Math.max(...data.genderIdx)).toBeLessThan(data.genders.length);
    expect(Math.max(...data.ageBandIdx)).toBeLessThan(data.ageBands.length);
    expect(Math.min(...data.genderIdx)).toBeGreaterThanOrEqual(-1);
    expect(Math.min(...data.ageBandIdx)).toBeGreaterThanOrEqual(-1);
  });

  it("derives gender-free age bands (no leading M/F prefix)", () => {
    for (const band of data.ageBands) {
      expect(band).not.toMatch(/^[MF]\d/); // e.g. never "M35-39"
    }
  });

  it("includes Male and Female gender labels", () => {
    expect(data.genders).toContain("Male");
    expect(data.genders).toContain("Female");
  });
});
