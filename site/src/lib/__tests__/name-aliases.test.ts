import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { buildSearchKeys, foldName, searchAthletesInIndex, searchBucket, type IndexEntry } from "../search-core";

const buildShards = createRequire(import.meta.url)("../../../../scripts/build-search-shards.js");
const entry = (fullName: string, slug = fullName.toLowerCase().replaceAll(" ", "-")): IndexEntry => ({
  slug, fullName, fullNameLower: foldName(fullName), country: "United States", countryISO: "US", raceCount: 1,
});
const entries = [
  entry("Alexander Ogura", "alexander-ogura--us-m"),
  entry("Thomas Edwards", "thomas-edwards--us-m"),
];
const keys = buildSearchKeys(entries);

describe("given-name aliases", () => {
  it.each([
    ["alex ogura", "alexander-ogura--us-m"],
    ["tom edwards", "thomas-edwards--us-m"],
    ["  ÁLEX   OGURA  ", "alexander-ogura--us-m"],
    ["ogura alex", "alexander-ogura--us-m"],
    ["edwards tom", "thomas-edwards--us-m"],
    ["alexander ogura", "alexander-ogura--us-m"],
    ["thomas edwards", "thomas-edwards--us-m"],
  ])("finds %s without changing the canonical profile", (query, slug) => {
    expect(searchAthletesInIndex(query, entries, keys)).toEqual([
      expect.objectContaining({ slug, fullName: entries.find((e) => e.slug === slug)!.fullName }),
    ]);
  });

  it("ranks literal full-name prefixes ahead of aliases and respects limits", () => {
    const index = [entry("Thomas Edwards"), entry("Tom Edwards")];
    const keys = buildSearchKeys(index);
    expect(searchAthletesInIndex("tom edwards", index, keys).map((e) => e.fullName)).toEqual(["Tom Edwards", "Thomas Edwards"]);
    expect(searchAthletesInIndex("tom edwards", index, keys, 1).map((e) => e.fullName)).toEqual(["Tom Edwards"]);
    expect(searchAthletesInIndex("alex", entries, buildSearchKeys(entries))).toHaveLength(1);
  });

  it("does not expand surnames, partial given names, or object prototype keys", () => {
    for (const name of ["John Thomas", "Thomason Edwards", "Constructor Edwards", "__proto__ Edwards"]) {
      const index = [entry(name)];
      expect(searchAthletesInIndex("tom edwards", index, buildSearchKeys(index))).toEqual([]);
    }
  });

  it("generates identical alias keys at build time and runtime", () => {
    for (const name of ["Alexander Ogura", "Thomas Edwards", "Thomas John Edwards", "Alexander-James Ogura", "John Thomas", "Constructor Edwards"]) {
      const e = entry(name);
      expect(buildShards.searchKeysForName(e.fullNameLower).sort()).toEqual(buildSearchKeys([e]).map((k) => k.key));
    }
  });

  it("places aliases in their query's shard, including tom → Thomas", () => {
    const shards = buildShards.buildShardMap(entries.map((e) => `${e.slug}\t${e.fullName}\t${e.country}\t${e.countryISO}\t${e.raceCount}`));
    for (const [query, slug] of [["alex ogura", "alexander-ogura--us-m"], ["tom edwards", "thomas-edwards--us-m"]]) {
      const lines: string[] = shards.get(searchBucket(query));
      expect(lines, `missing shard for ${query}`).toBeDefined();
      const index = lines.map((line) => { const [slug, name] = line.split("\t"); return entry(name, slug); });
      expect(searchAthletesInIndex(query, index, buildSearchKeys(index)).map((e) => e.slug)).toEqual([slug]);
    }
  });
});
