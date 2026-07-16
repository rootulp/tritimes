import { describe, it, expect } from "vitest";
import { buildTopFinishers } from "../data";
import type { CourseResult } from "../types";

function cr(over: Partial<CourseResult>): CourseResult {
  return {
    id: 0, firstName: "", lastName: "", fullName: "", bib: "",
    ageGroup: "M35-39", gender: "Male", city: "", state: "",
    country: "", countryISO: "",
    swimTime: "", bikeTime: "", runTime: "", t1Time: "", t2Time: "", finishTime: "9:00:00",
    swimSeconds: 1000, bikeSeconds: 2000, runSeconds: 1500,
    t1Seconds: 0, t2Seconds: 0, finishSeconds: 4500,
    overallRank: 0, genderRank: 0, ageGroupRank: 0, status: "Finisher",
    raceSlug: "im-x-2024", year: "2024",
    ...over,
  } as CourseResult;
}

describe("buildTopFinishers", () => {
  const pool = [
    cr({ gender: "Male", finishSeconds: 5000, fullName: "Slow", raceSlug: "im-x-2024", year: "2024" }),
    cr({ gender: "Male", finishSeconds: 3000, fullName: "Fast", raceSlug: "im-x-2026", year: "2026" }),
    cr({ gender: "Female", finishSeconds: 3500, fullName: "Fem", raceSlug: "im-x-2025", year: "2025" }),
  ];

  it("ranks a gender by fastest finish across editions with computed ranks", () => {
    const top = buildTopFinishers(pool, "Male");
    expect(top.map((e) => e.fullName)).toEqual(["Fast", "Slow"]);
    expect(top.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("carries the edition slug and year on each entry", () => {
    const top = buildTopFinishers(pool, "Male");
    expect(top[0].raceSlug).toBe("im-x-2026");
    expect(top[0].year).toBe("2026");
  });

  it("filters to the requested gender", () => {
    expect(buildTopFinishers(pool, "Female").map((e) => e.fullName)).toEqual(["Fem"]);
  });

  it("respects the limit", () => {
    expect(buildTopFinishers(pool, "Male", 1).map((e) => e.fullName)).toEqual(["Fast"]);
  });
});
