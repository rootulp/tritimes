import { describe, expect, it } from "vitest";
import { parseIndexTsv } from "../client-search-index";

describe("parseIndexTsv", () => {
  it("parses one line into one IndexEntry", () => {
    const tsv = "john-smith\tJohn Smith\tUnited States\tUS\t4";
    expect(parseIndexTsv(tsv)).toEqual([
      {
        slug: "john-smith",
        fullName: "John Smith",
        fullNameLower: "john smith",
        country: "United States",
        countryISO: "US",
        raceCount: 4,
      },
    ]);
  });

  it("parses multiple lines and skips blanks", () => {
    const tsv = [
      "alicia-goldsmith\tAlicia Goldsmith\tUnited States\tUS\t1",
      "",
      "zoe-jones\tZoe Jones\tAustralia\tAU\t3",
    ].join("\n");
    const entries = parseIndexTsv(tsv);
    expect(entries.map((e) => e.slug)).toEqual(["alicia-goldsmith", "zoe-jones"]);
  });

  it("lowercases fullName into fullNameLower", () => {
    const tsv = "x\tFoo BAR\tx\tXX\t1";
    expect(parseIndexTsv(tsv)[0].fullNameLower).toBe("foo bar");
  });

  it("parses raceCount as a number", () => {
    const tsv = "x\tx\tx\tXX\t42";
    expect(parseIndexTsv(tsv)[0].raceCount).toBe(42);
  });
});
