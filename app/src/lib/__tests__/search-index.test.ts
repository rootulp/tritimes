import { describe, expect, it } from "vitest";
import { searchAthletesInIndex, type IndexEntry } from "../search-index";

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

describe("searchAthletesInIndex", () => {
  it("finds first-name prefix matches", () => {
    expect(searchAthletesInIndex("john", athletes)).toMatchObject([
      { slug: "john-smith" },
    ]);
  });

  it("finds last-name prefix matches without waiting for substring fallback", () => {
    expect(searchAthletesInIndex("smith", athletes)).toMatchObject([
      { slug: "john-smith" },
      { slug: "sarah-smith" },
    ]);
  });

  it("finds last-name-first multi-token queries", () => {
    expect(searchAthletesInIndex("smith jo", athletes)).toMatchObject([
      { slug: "john-smith" },
    ]);
  });

  it("does not duplicate entries found through multiple search keys", () => {
    const results = searchAthletesInIndex("john", athletes);
    expect(results.map((athlete) => athlete.slug)).toEqual(["john-smith"]);
  });

  it("keeps substring fallback for non-token infix queries", () => {
    expect(searchAthletesInIndex("oldsmith", athletes)).toMatchObject([
      { slug: "alicia-goldsmith" },
    ]);
  });
});
