import { describe, it, expect } from "vitest";
import {
  searchBucket,
  shardFileName,
  buildSearchKeys,
  searchAthletesInIndex,
  type IndexEntry,
} from "@/lib/search-core";
import { createRequire } from "module";

const nodeRequire = createRequire(import.meta.url);
const buildShards = nodeRequire("../../../../scripts/build-search-shards.js");

function entry(slug: string, fullName: string, raceCount = 1): IndexEntry {
  return {
    slug,
    fullName,
    fullNameLower: fullName.toLowerCase(),
    country: "United States",
    countryISO: "US",
    raceCount,
  };
}

describe("searchBucket (query → 2-char bucket)", () => {
  it("uses the first two chars of the normalized query", () => {
    expect(searchBucket("Smith")).toBe("sm");
    expect(searchBucket("  John   Smith ")).toBe("jo");
  });

  it("returns null for queries shorter than two chars", () => {
    expect(searchBucket("a")).toBeNull();
    expect(searchBucket("  a  ")).toBeNull();
    expect(searchBucket("")).toBeNull();
  });

  it("keeps an inner space in single-letter-token queries", () => {
    expect(searchBucket("a b")).toBe("a ");
  });
});

describe("shardFileName", () => {
  it("hex-encodes the bucket as UTF-8", () => {
    expect(shardFileName("ma")).toBe("6d61.tsv.gz");
    expect(shardFileName("a ")).toBe("6120.tsv.gz");
  });

  it("handles non-ASCII buckets", () => {
    // "ö" = 0xc3 0xb6 in UTF-8
    expect(shardFileName("ös")).toBe("c3b673.tsv.gz");
  });
});

describe("build script parity", () => {
  it("script shardFileName matches search-core shardFileName", () => {
    for (const bucket of ["ma", "jo", "a ", "ös", "zz"]) {
      expect(buildShards.shardFileName(bucket)).toBe(shardFileName(bucket));
    }
  });

  it("matches pinned values (build/runtime parity anchor)", () => {
    // Hardcoded so any drift between the script and search-core is caught —
    // do NOT recompute these from the functions.
    expect(buildShards.shardFileName("ma")).toBe("6d61.tsv.gz");
    expect(buildShards.shardFileName("jo")).toBe("6a6f.tsv.gz");
  });

  it("script bucketsForName mirrors buildSearchKeys key prefixes", () => {
    const entries = [entry("john-smith", "John Smith")];
    const keys = buildSearchKeys(entries);
    const expected = new Set(keys.map((k) => k.key.slice(0, 2)));
    expect(new Set(buildShards.bucketsForName("john smith"))).toEqual(expected);
  });
});

describe("bucketsForName", () => {
  it("includes a bucket per token rotation so last-name search works", () => {
    expect(new Set(buildShards.bucketsForName("john smith"))).toEqual(
      new Set(["jo", "sm"]),
    );
  });

  it("splits tokens on hyphens like buildSearchKeys", () => {
    expect(new Set(buildShards.bucketsForName("anna-marie lee"))).toEqual(
      new Set(["an", "ma", "le"]),
    );
  });

  it("skips keys shorter than two chars (cannot prefix-match a 2+ char query)", () => {
    expect(buildShards.bucketsForName("")).toEqual([]);
  });

  it("dedupes buckets shared by multiple keys", () => {
    const buckets = buildShards.bucketsForName("smith smith");
    expect(buckets).toEqual(["sm"]);
  });
});

describe("buildShardMap", () => {
  const entries = [
    entry("john-smith", "John Smith", 4),
    entry("sarah-smith", "Sarah Smith", 2),
    entry("alicia-goldsmith", "Alicia Goldsmith", 1),
    entry("zoe-jones", "Zoe Jones", 3),
  ];
  const lines = entries.map(
    (e) => `${e.slug}\t${e.fullName}\t${e.country}\t${e.countryISO}\t${e.raceCount}`,
  );
  const shards = buildShards.buildShardMap(lines);

  it("places entries in every bucket one of their keys starts with", () => {
    const sm = shards.get("sm").map((l: string) => l.split("\t")[0]);
    expect(sm).toEqual(["john-smith", "sarah-smith"]);
    const jo = shards.get("jo").map((l: string) => l.split("\t")[0]);
    expect(jo).toEqual(["john-smith", "zoe-jones"]);
  });

  it("sorts shard lines by code-unit fullNameLower (binary-search precondition)", () => {
    for (const lines of shards.values()) {
      const names = lines.map((l: string) => l.split("\t")[1].toLowerCase());
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    }
  });

  it("yields the same results as a full-index search for prefix queries", () => {
    for (const query of ["smith", "jo", "smith j", "alicia"]) {
      const bucket = searchBucket(query)!;
      const shardLines: string[] = shards.get(bucket) ?? [];
      const shardEntries = shardLines.map((l: string) => {
        const [slug, fullName, country, countryISO, raceCount] = l.split("\t");
        return {
          slug,
          fullName,
          fullNameLower: fullName.toLowerCase(),
          country,
          countryISO,
          raceCount: +raceCount,
        };
      });
      const fromShard = searchAthletesInIndex(
        query,
        shardEntries,
        buildSearchKeys(shardEntries),
        10,
      );
      const fromFull = searchAthletesInIndex(query, entries, buildSearchKeys(entries), 10);
      expect(fromShard).toEqual(fromFull);
    }
  });
});
