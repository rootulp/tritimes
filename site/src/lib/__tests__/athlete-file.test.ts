import { describe, it, expect } from "vitest";
import { athleteShardId, packRaceEntry, unpackProfile } from "../athlete-file";
import type { AthleteRaceEntry } from "../types";

describe("athleteShardId", () => {
  it("is djb2 modulo 4096, so the browser finds the shard the build wrote", () => {
    // djb2("ab") = (5381 * 33 + 97) * 33 + 98 = 5863208; 5863208 % 4096 = 1832.
    expect(athleteShardId("ab")).toBe(1832);
    expect(athleteShardId("rootul-patel--us-m")).toBeLessThan(4096);
  });
});

describe("pack / unpack", () => {
  it("round-trips an entry and fills race name, date, and distance from the race index", () => {
    const entry: AthleteRaceEntry = {
      raceSlug: "im703-oceanside-2025",
      raceName: "2025 IRONMAN 70.3 Oceanside",
      raceDate: "2025-04-05",
      resultId: 812,
      finishTime: "5:01:38",
      finishSeconds: 18098,
      overallPercentile: 71,
      distance: "70.3",
      ageGroup: "M30-34",
      swimTime: "0:40:24",
      bikeTime: "2:33:19",
      runTime: "1:42:06",
      swimSeconds: 2424,
      bikeSeconds: 9199,
      runSeconds: 6126,
    };
    const profile = unpackProfile("x--us-m", ["X", "United States", "US", [packRaceEntry(entry)]], {
      "im703-oceanside-2025": ["2025 IRONMAN 70.3 Oceanside", "2025-04-05"],
    });
    expect(profile).toEqual({ slug: "x--us-m", fullName: "X", country: "United States", countryISO: "US", races: [entry] });
  });
});
