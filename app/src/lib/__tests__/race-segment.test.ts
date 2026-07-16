import { describe, it, expect } from "vitest";
import { buildRaceSegmentData } from "../data";
import type { AthleteResult } from "../types";

// Minimal AthleteResult factory — buildRaceSegmentData only reads gender,
// ageGroup, and the four discipline seconds. We test the pure transform with
// synthetic data so the test doesn't depend on the build-time CSV corpus
// (data/*.csv.gz), which is absent in the `npm test` CI job.
function finisher(over: Partial<AthleteResult>): AthleteResult {
  return {
    gender: "Male",
    ageGroup: "M35-39",
    swimSeconds: 1000,
    bikeSeconds: 2000,
    runSeconds: 1500,
    finishSeconds: 4500,
    // Unused-by-transform fields, present to satisfy the type.
    id: 0,
    firstName: "",
    lastName: "",
    fullName: "",
    bib: "",
    city: "",
    state: "",
    country: "",
    countryISO: "",
    swimTime: "",
    bikeTime: "",
    runTime: "",
    t1Time: "",
    t2Time: "",
    finishTime: "",
    t1Seconds: 0,
    t2Seconds: 0,
    overallRank: 0,
    genderRank: 0,
    ageGroupRank: 0,
    ...over,
  } as AthleteResult;
}

describe("buildRaceSegmentData", () => {
  const results: AthleteResult[] = [
    finisher({ gender: "Male", ageGroup: "M35-39" }),
    finisher({ gender: "Female", ageGroup: "F35-39" }),
    finisher({ gender: "Male", ageGroup: "M18-24" }),
    finisher({ gender: "Female", ageGroup: "FPRO" }),
    finisher({ gender: "", ageGroup: "" }), // blank → -1 sentinel
  ];
  const data = buildRaceSegmentData(results);

  it("returns equal-length parallel arrays", () => {
    const n = results.length;
    expect(data.swim.length).toBe(n);
    expect(data.bike.length).toBe(n);
    expect(data.run.length).toBe(n);
    expect(data.finish.length).toBe(n);
    expect(data.genderIdx.length).toBe(n);
    expect(data.ageBandIdx.length).toBe(n);
  });

  it("orders gender labels Male before Female", () => {
    expect(data.genders).toEqual(["Male", "Female"]);
  });

  it("derives gender-free age bands ordered numerically, PRO last", () => {
    expect(data.ageBands).toEqual(["18-24", "35-39", "PRO"]);
    for (const band of data.ageBands) {
      expect(band).not.toMatch(/^[MF]\d/); // e.g. never "M35-39"
    }
  });

  it("maps each finisher's indices into the label tables", () => {
    // index 0: Male (0) / 35-39 (1)
    expect(data.genderIdx[0]).toBe(0);
    expect(data.ageBandIdx[0]).toBe(1);
    // index 1: Female (1) / 35-39 (1)
    expect(data.genderIdx[1]).toBe(1);
    expect(data.ageBandIdx[1]).toBe(1);
    // index 3: Female (1) / PRO (2)
    expect(data.genderIdx[3]).toBe(1);
    expect(data.ageBandIdx[3]).toBe(2);
  });

  it("assigns the -1 sentinel to blank gender/age group", () => {
    expect(data.genderIdx[4]).toBe(-1);
    expect(data.ageBandIdx[4]).toBe(-1);
    // Blank values are excluded from the label tables entirely.
    expect(data.genders).not.toContain("");
    expect(data.ageBands).not.toContain("");
  });

  it("carries discipline seconds through in order", () => {
    const custom = buildRaceSegmentData([
      finisher({ swimSeconds: 111, bikeSeconds: 222, runSeconds: 333, finishSeconds: 444 }),
    ]);
    expect(custom.swim[0]).toBe(111);
    expect(custom.bike[0]).toBe(222);
    expect(custom.run[0]).toBe(333);
    expect(custom.finish[0]).toBe(444);
  });
});
