import { describe, expect, it } from "vitest";
import {
  buildSearchKeys,
  foldName,
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

describe("foldName", () => {
  it("lowercases and strips combining diacritics", () => {
    expect(foldName("Müller")).toBe("muller");
    expect(foldName("Németh")).toBe("nemeth");
    expect(foldName("Pierré")).toBe("pierre");
    expect(foldName("Åse")).toBe("ase");
    expect(foldName("João")).toBe("joao");
  });

  it("folds special letters that have no NFD decomposition", () => {
    expect(foldName("Thronæs")).toBe("thronaes");
    expect(foldName("Søren")).toBe("soren");
    expect(foldName("Großmann")).toBe("grossmann");
    expect(foldName("Đorđe")).toBe("dorde");
    expect(foldName("Guðrún")).toBe("gudrun");
    expect(foldName("Þór")).toBe("thor");
    expect(foldName("Łukasz")).toBe("lukasz");
    expect(foldName("Œuvre")).toBe("oeuvre");
  });

  it("leaves plain ASCII names untouched", () => {
    expect(foldName("John Smith")).toBe("john smith");
  });
});

describe("diacritic-insensitive search", () => {
  function entry(slug: string, fullName: string): IndexEntry {
    return {
      slug,
      fullName,
      fullNameLower: foldName(fullName),
      country: "Switzerland",
      countryISO: "CH",
      raceCount: 1,
    };
  }
  // Sorted by folded fullNameLower (binary-search precondition).
  const athletes: IndexEntry[] = [
    entry("alain-muller", "Muller Alain"),
    entry("beni-muller", "Müller Beni"),
    entry("zsolt-nemeth", "Németh Zsolt"),
  ];
  const keys = buildSearchKeys(athletes);

  it("finds accented names from an unaccented query", () => {
    expect(searchAthletesInIndex("muller", athletes, keys)).toMatchObject([
      { slug: "alain-muller" },
      { slug: "beni-muller" },
    ]);
    expect(searchAthletesInIndex("nemeth", athletes, keys)).toMatchObject([
      { slug: "zsolt-nemeth" },
    ]);
  });

  it("finds unaccented names from an accented query", () => {
    expect(searchAthletesInIndex("müller", athletes, keys)).toMatchObject([
      { slug: "alain-muller" },
      { slug: "beni-muller" },
    ]);
  });

  it("matches rotated tokens diacritic-insensitively", () => {
    expect(searchAthletesInIndex("beni mü", athletes, keys)).toMatchObject([
      { slug: "beni-muller" },
    ]);
  });

  it("keeps the accented display name in results", () => {
    const results = searchAthletesInIndex("muller be", athletes, keys);
    expect(results).toMatchObject([{ fullName: "Müller Beni" }]);
  });
});

describe("buildSearchKeys ordering", () => {
  it("sorts keys by code units to match the binary search's < comparison", () => {
    // localeCompare sorts "ézra" before "zoe" (é collates with e), but the
    // binary search compares code units ("é" > "z"). The sort must agree
    // with the search or accented keys land outside the searched range.
    const entries: IndexEntry[] = [
      {
        slug: "ezra",
        fullName: "Ézra",
        fullNameLower: "ézra",
        country: "",
        countryISO: "",
        raceCount: 1,
      },
      {
        slug: "zoe",
        fullName: "Zoe",
        fullNameLower: "zoe",
        country: "",
        countryISO: "",
        raceCount: 1,
      },
    ];
    const sortedKeys = buildSearchKeys(entries).map((k) => k.key);
    const codeUnitSorted = [...sortedKeys].sort();
    expect(sortedKeys).toEqual(codeUnitSorted);
  });
});
