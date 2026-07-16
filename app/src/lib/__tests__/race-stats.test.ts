import { describe, it, expect } from "vitest";
import { computeRaceStats } from "../data";
import type { AthleteResult } from "../types";

function finisher(over: Partial<AthleteResult>): AthleteResult {
  return {
    id: 0, firstName: "", lastName: "", fullName: "", bib: "",
    ageGroup: "M35-39", gender: "Male", city: "", state: "",
    country: "", countryISO: "",
    swimTime: "", bikeTime: "", runTime: "", t1Time: "", t2Time: "", finishTime: "",
    swimSeconds: 1000, bikeSeconds: 2000, runSeconds: 1500,
    t1Seconds: 0, t2Seconds: 0, finishSeconds: 4500,
    overallRank: 0, genderRank: 0, ageGroupRank: 0, status: "Finisher",
    ...over,
  } as AthleteResult;
}

describe("computeRaceStats", () => {
  const results = [
    finisher({ gender: "Male", genderRank: 1, finishSeconds: 4000, fullName: "A" }),
    finisher({ gender: "Male", genderRank: 2, finishSeconds: 5000, fullName: "B" }),
    finisher({ gender: "Female", genderRank: 1, finishSeconds: 4200, fullName: "C" }),
  ];

  it("counts finishers", () => {
    expect(computeRaceStats(results).totalFinishers).toBe(3);
  });

  it("computes the Total discipline fastest/slowest", () => {
    const total = computeRaceStats(results).disciplines.find((d) => d.discipline === "Total")!;
    expect(total.fastest).toBe(4000);
    expect(total.slowest).toBe(5000);
  });

  it("builds gender leaderboards ordered by genderRank", () => {
    const stats = computeRaceStats(results);
    expect(stats.maleLeaderboard.map((e) => e.fullName)).toEqual(["A", "B"]);
    expect(stats.femaleLeaderboard.map((e) => e.fullName)).toEqual(["C"]);
  });

  it("produces the four discipline histograms", () => {
    const h = computeRaceStats(results).histograms;
    expect(h.swim.totalAthletes).toBeGreaterThan(0);
    expect(h.finish.totalAthletes).toBeGreaterThan(0);
  });
});
