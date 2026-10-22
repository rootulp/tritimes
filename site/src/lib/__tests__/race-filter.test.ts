import { describe, it, expect } from "vitest";
import { filterRaces, matchesRaceQuery } from "../race-filter";
import type { RaceInfo } from "../types";

const races: RaceInfo[] = [
  {
    slug: "im703-new-york",
    name: "IRONMAN 70.3 New York",
    date: "2025-09-07",
    location: "New York, NY, United States",
    finishers: 2100,
  },
  {
    slug: "im-lake-placid",
    name: "IRONMAN Lake Placid",
    date: "2024-07-21",
    location: "Lake Placid, NY, United States",
    finishers: 1800,
  },
  {
    slug: "im703-sao-paulo",
    name: "IRONMAN 70.3 São Paulo",
    date: "2024-04-14",
    location: "São Paulo, Brazil",
    finishers: 1500,
  },
];

describe("matchesRaceQuery", () => {
  it("matches everything when the query is empty or whitespace", () => {
    expect(matchesRaceQuery(races[0], "")).toBe(true);
    expect(matchesRaceQuery(races[0], "   ")).toBe(true);
  });

  it("matches by race name, case-insensitively", () => {
    expect(matchesRaceQuery(races[1], "lake placid")).toBe(true);
    expect(matchesRaceQuery(races[1], "LAKE")).toBe(true);
    expect(matchesRaceQuery(races[0], "lake placid")).toBe(false);
  });

  it("matches by location, case-insensitively", () => {
    expect(matchesRaceQuery(races[2], "brazil")).toBe(true);
    expect(matchesRaceQuery(races[0], "united states")).toBe(true);
    expect(matchesRaceQuery(races[2], "united states")).toBe(false);
  });

  it("matches substrings anywhere in the name or location", () => {
    expect(matchesRaceQuery(races[0], "york")).toBe(true);
    expect(matchesRaceQuery(races[1], "placid")).toBe(true);
  });

  it("ignores diacritics in both the query and the race fields", () => {
    expect(matchesRaceQuery(races[2], "sao paulo")).toBe(true);
    expect(matchesRaceQuery(races[2], "São")).toBe(true);
    expect(matchesRaceQuery(races[0], "São")).toBe(false);
  });

  it("does not match unrelated text", () => {
    expect(matchesRaceQuery(races[0], "kona")).toBe(false);
  });
});

describe("filterRaces", () => {
  it("returns all races with default filters", () => {
    expect(filterRaces(races, { distance: "All", year: "All", query: "" })).toEqual(races);
  });

  it("filters by distance using the slug prefix", () => {
    expect(
      filterRaces(races, { distance: "70.3", year: "All", query: "" }).map((r) => r.slug),
    ).toEqual(["im703-new-york", "im703-sao-paulo"]);
    expect(
      filterRaces(races, { distance: "140.6", year: "All", query: "" }).map((r) => r.slug),
    ).toEqual(["im-lake-placid"]);
  });

  it("filters by year", () => {
    expect(
      filterRaces(races, { distance: "All", year: "2024", query: "" }).map((r) => r.slug),
    ).toEqual(["im-lake-placid", "im703-sao-paulo"]);
  });

  it("filters by text query", () => {
    expect(
      filterRaces(races, { distance: "All", year: "All", query: "new york" }).map((r) => r.slug),
    ).toEqual(["im703-new-york"]);
  });

  it("composes text query with distance and year filters", () => {
    expect(
      filterRaces(races, { distance: "70.3", year: "2024", query: "sao" }).map((r) => r.slug),
    ).toEqual(["im703-sao-paulo"]);
    expect(filterRaces(races, { distance: "140.6", year: "2024", query: "sao" })).toEqual([]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterRaces(races, { distance: "All", year: "All", query: "kona" })).toEqual([]);
  });
});
