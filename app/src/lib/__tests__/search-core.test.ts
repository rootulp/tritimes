import { describe, expect, it } from "vitest";
import {
  buildSearchKeys,
  searchAthletesInIndex,
  type IndexEntry,
} from "../search-core";

const athletes: IndexEntry[] = [
  {
    slug: "alicia-goldsmith",
    fullName: "Alicia Goldsmith",
    fullNameLower: "alicia goldsmith",
    country: "United States",
    countryISO: "US",
    raceCount: 1,
  },
  {
    slug: "john-smith",
    fullName: "John Smith",
    fullNameLower: "john smith",
    country: "United States",
    countryISO: "US",
    raceCount: 4,
  },
  {
    slug: "sarah-smith",
    fullName: "Sarah Smith",
    fullNameLower: "sarah smith",
    country: "Canada",
    countryISO: "CA",
    raceCount: 2,
  },
  {
    slug: "zoe-jones",
    fullName: "Zoe Jones",
    fullNameLower: "zoe jones",
    country: "Australia",
    countryISO: "AU",
    raceCount: 3,
  },
];
const keys = buildSearchKeys(athletes);

describe("searchAthletesInIndex (core)", () => {
  it("finds first-name prefix matches", () => {
    expect(searchAthletesInIndex("john", athletes, keys)).toMatchObject([
      { slug: "john-smith" },
    ]);
  });

  it("finds last-name prefix matches via rotated token keys", () => {
    expect(searchAthletesInIndex("smith", athletes, keys)).toMatchObject([
      { slug: "john-smith" },
      { slug: "sarah-smith" },
    ]);
  });

  it("finds last-name-first multi-token queries", () => {
    expect(searchAthletesInIndex("smith jo", athletes, keys)).toMatchObject([
      { slug: "john-smith" },
    ]);
  });

  it("does not duplicate entries found through multiple search keys", () => {
    const results = searchAthletesInIndex("john", athletes, keys);
    expect(results.map((athlete) => athlete.slug)).toEqual(["john-smith"]);
  });

  it("keeps substring fallback for non-token infix queries", () => {
    expect(searchAthletesInIndex("oldsmith", athletes, keys)).toMatchObject([
      { slug: "alicia-goldsmith" },
    ]);
  });

  it("returns empty for empty/whitespace query", () => {
    expect(searchAthletesInIndex("", athletes, keys)).toEqual([]);
    expect(searchAthletesInIndex("   ", athletes, keys)).toEqual([]);
  });

  it("respects the limit", () => {
    expect(searchAthletesInIndex("s", athletes, keys, 1).length).toBe(1);
  });
});
