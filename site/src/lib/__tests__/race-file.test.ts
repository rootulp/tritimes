import { describe, it, expect } from "vitest";
import { parseResultsCSV } from "../stats";
import { disciplineHistogram, encodeRaceFile, getResult, raceFileSegments } from "../race-file";

const HEADER =
  "FirstName,LastName,FullName,Bib,AgeGroup,Gender,City,State,Country,CountryISO,SwimTime,BikeTime,RunTime,T1Time,T2Time,FinishTime,SwimSeconds,BikeSeconds,RunSeconds,T1Seconds,T2Seconds,FinishSeconds,OverallRank,GenderRank,AgeGroupRank,Status";

function row(name: string, ag: string, gender: string, swim: number, status = "Finisher", swimTime = "") {
  return `A,B,${name},7,${ag},${gender},Tempe,AZ,United States,US,${swimTime},,,,,,${swim},0,0,0,0,0,1,1,1,${status}`;
}

// Row 1 is a DNF: result ids are CSV row indexes, so the finishers are ids 0, 2, 3, 4.
const CSV = [
  HEADER,
  row("Ann", "F30-34", "Female", 3000, "Finisher", "0:50:00"),
  row("Dnf", "F30-34", "Female", 3050, "DNF"),
  row("Bea", "F30-34", "Female", 3100),
  row("Cat", "F30-34", "Female", 3700),
  row("Dan", "M30-34", "Male", 2000),
].join("\n");

const file = encodeRaceFile({ slug: "im-test-2025", name: "2025 IRONMAN Test", date: "2025-01-01", finishers: 4 }, parseResultsCSV(CSV));

describe("getResult", () => {
  it("looks results up by CSV row index, skipping non-finishers", () => {
    expect(getResult(file, 0)?.fullName).toBe("Ann");
    expect(getResult(file, 1)).toBeUndefined();
    expect(getResult(file, 2)?.fullName).toBe("Bea");
    expect(getResult(file, 4)).toMatchObject({ fullName: "Dan", ageGroup: "M30-34", gender: "Male", swimSeconds: 2000 });
  });

  it("keeps the published display strings even when they disagree with the seconds", () => {
    expect(getResult(file, 0)?.swimTime).toBe("0:50:00");
    expect(getResult(file, 2)?.swimTime).toBe("");
  });
});

describe("disciplineHistogram", () => {
  it("bins the age group only and uses the production bin-based percentile", () => {
    const ann = getResult(file, 0)!;
    const h = disciplineHistogram(file, ann, "swim", "ageGroup");
    // F30-34 swims: 3000, 3100, 3700 in 5-minute bins from 3000 to 3900.
    expect(h.bins.map((b) => [b.rangeStart, b.count, b.isAthlete])).toEqual([
      [3000, 2, true],
      [3300, 0, false],
      [3600, 1, false],
    ]);
    // Only bins starting after 3000s count as slower: 1 of 3, not the exact 2 of 3.
    expect(h.athletePercentile).toBeCloseTo(100 / 3);
    expect(h.medianSeconds).toBe(3100);
  });

  it("includes every finisher for the overall field", () => {
    const ann = getResult(file, 0)!;
    const h = disciplineHistogram(file, ann, "swim", "overall");
    expect(h.bins.reduce((n, b) => n + b.count, 0)).toBe(4);
    // Dan (2000s) is faster, Cat (3700s) is in a later bin: 1 of 4 slower.
    expect(h.athletePercentile).toBe(25);
  });

  it("returns an empty histogram when nobody has a time for the discipline", () => {
    const h = disciplineHistogram(file, getResult(file, 0)!, "bike", "overall");
    expect(h).toEqual({ bins: [], athleteSeconds: 0, athletePercentile: 0, medianSeconds: 0 });
  });
});

describe("raceFileSegments", () => {
  it("orders genders Male first and maps age groups to shared bands", () => {
    const seg = raceFileSegments(file);
    expect(seg.genders).toEqual(["Male", "Female"]);
    expect(seg.ageBands).toEqual(["30-34"]);
    expect(seg.genderIdx).toEqual([1, 1, 1, 0]);
    expect(seg.ageBandIdx).toEqual([0, 0, 0, 0]);
  });
});
