import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseIndexTsv,
  loadShardForQuery,
  searchAthletesInShard,
  __resetForTests,
} from "../client-search-index";
import { gzipSync } from "node:zlib";
import { Readable } from "node:stream";

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

function makeGzippedResponse(tsv: string): Response {
  const buf = gzipSync(tsv);
  return new Response(Readable.toWeb(Readable.from([buf])) as ReadableStream, {
    status: 200,
    headers: { "Content-Type": "application/gzip" },
  });
}

const SMITH_TSV = [
  "john-smith\tJohn Smith\tUnited States\tUS\t4",
  "sarah-smith\tSarah Smith\tCanada\tCA\t2",
].join("\n");

describe("loadShardForQuery", () => {
  beforeEach(() => {
    __resetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for queries shorter than two normalized chars", () => {
    expect(loadShardForQuery("a")).toBeNull();
    expect(loadShardForQuery("  ")).toBeNull();
  });

  it("fetches the shard file for the query's 2-char bucket", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeGzippedResponse(SMITH_TSV));

    const shard = await loadShardForQuery("smith");

    // "sm" → 0x73 0x6d
    expect(fetchMock).toHaveBeenCalledWith("/search-shards/736d.tsv.gz");
    expect(shard!.entries.map((e) => e.slug)).toEqual(["john-smith", "sarah-smith"]);
  });

  it("fetches a bucket only once across queries sharing a prefix", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeGzippedResponse(SMITH_TSV));

    const [a, b] = await Promise.all([
      loadShardForQuery("smith"),
      loadShardForQuery("smyth"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("fetches separate shards for different buckets", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => makeGzippedResponse(SMITH_TSV));

    await loadShardForQuery("smith");
    await loadShardForQuery("jones");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("/search-shards/736d.tsv.gz");
    expect(fetchMock).toHaveBeenCalledWith("/search-shards/6a6f.tsv.gz");
  });

  it("treats a 404 as an empty shard and caches it", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));

    const shard = await loadShardForQuery("zq");
    expect(shard!.entries).toEqual([]);

    await loadShardForQuery("zq");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches a rejection so callers do not retry", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network"));

    await expect(loadShardForQuery("smith")).rejects.toThrow("network");
    await expect(loadShardForQuery("smith")).rejects.toThrow("network");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("searchAthletesInShard", () => {
  beforeEach(() => {
    __resetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("finds prefix and rotated-token matches within the shard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(makeGzippedResponse(SMITH_TSV));
    const shard = (await loadShardForQuery("smith"))!;

    expect(searchAthletesInShard("smith", shard)).toMatchObject([
      { slug: "john-smith" },
      { slug: "sarah-smith" },
    ]);
    expect(searchAthletesInShard("smith sa", shard)).toMatchObject([
      { slug: "sarah-smith" },
    ]);
  });

  it("respects the limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(makeGzippedResponse(SMITH_TSV));
    const shard = (await loadShardForQuery("smith"))!;
    expect(searchAthletesInShard("smith", shard, 1)).toHaveLength(1);
  });
});
