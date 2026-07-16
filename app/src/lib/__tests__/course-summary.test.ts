import { describe, it, expect } from "vitest";
import { getCourseYearSummary } from "../data";
import type { CourseResult } from "../types";

function cr(over: Partial<CourseResult>): CourseResult {
  return {
    id: 0, firstName: "", lastName: "", fullName: "", bib: "",
    ageGroup: "M35-39", gender: "Male", city: "", state: "",
    country: "", countryISO: "",
    swimTime: "", bikeTime: "", runTime: "", t1Time: "", t2Time: "", finishTime: "",
    swimSeconds: 0, bikeSeconds: 0, runSeconds: 0,
    t1Seconds: 0, t2Seconds: 0, finishSeconds: 4500,
    overallRank: 0, genderRank: 0, ageGroupRank: 0, status: "Finisher",
    raceSlug: "im-x-2024", year: "2024",
    ...over,
  } as CourseResult;
}

describe("getCourseYearSummary", () => {
  const pool = [
    cr({ raceSlug: "im-x-2024", year: "2024", finishSeconds: 4000 }),
    cr({ raceSlug: "im-x-2024", year: "2024", finishSeconds: 6000 }),
    cr({ raceSlug: "im-x-2024", year: "2024", finishSeconds: 0 }),
    cr({ raceSlug: "im-x-2026", year: "2026", finishSeconds: 5000 }),
  ];

  it("summarizes finishers and median finish per edition, newest first", () => {
    const rows = getCourseYearSummary(pool);
    expect(rows.map((r) => r.year)).toEqual(["2026", "2024"]);

    const y2024 = rows.find((r) => r.year === "2024")!;
    expect(y2024.finishers).toBe(3); // counts all rows, including the 0-second one
    expect(y2024.medianFinish).toBe(5000); // median of [4000, 6000]; 0 excluded by >0 filter
    expect(y2024.slug).toBe("im-x-2024");

    const y2026 = rows.find((r) => r.year === "2026")!;
    expect(y2026.finishers).toBe(1);
    expect(y2026.medianFinish).toBe(5000);
    expect(y2026.slug).toBe("im-x-2026");
  });
});
