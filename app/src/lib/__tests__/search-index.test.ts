import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";
import {
  searchAthletes,
  searchAthletesInIndex,
  __resetForTests,
  type IndexEntry,
} from "../search-index";

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

const SMITH_TSV = [
  "john-smith\tJohn Smith\tUnited States\tUS\t4",
  "sarah-smith\tSarah Smith\tCanada\tCA\t2",
].join("\n");

function gzippedResponse(tsv: string): Response {
  return new Response(new Uint8Array(gzipSync(tsv)), { status: 200 });
}

describe("searchAthletes (shard-backed)", () => {
  beforeEach(() => {
    __resetForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fetches only the query's shard from the deployment's static assets", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(gzippedResponse(SMITH_TSV));

    const results = await searchAthletes("smith", 10);

    // "sm" → 0x73 0x6d; no VERCEL_URL → local origin.
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/search-shards/736d.tsv.gz",
      expect.objectContaining({ cache: "force-cache" }),
    );
    expect(results).toMatchObject([{ slug: "john-smith" }, { slug: "sarah-smith" }]);
  });

  it("serves rotated-token queries from the shard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(gzippedResponse(SMITH_TSV));
    expect(await searchAthletes("smith sa", 10)).toMatchObject([
      { slug: "sarah-smith" },
    ]);
  });

  it("uses VERCEL_URL and the protection-bypass header when set", async () => {
    vi.stubEnv("VERCEL_URL", "example.vercel.app");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "s3cret");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(gzippedResponse(SMITH_TSV));

    await searchAthletes("smith", 10);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.vercel.app/search-shards/736d.tsv.gz",
      expect.objectContaining({
        headers: { "x-vercel-protection-bypass": "s3cret" },
      }),
    );
  });

  it("caches a loaded shard per bucket", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(gzippedResponse(SMITH_TSV));

    await searchAthletes("smith", 10);
    await searchAthletes("smyth", 10);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a 404 as an empty shard and caches it", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));

    expect(await searchAthletes("zq", 10)).toEqual([]);
    expect(await searchAthletes("zq", 10)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns empty on transient failure without caching, so the next request retries", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(gzippedResponse(SMITH_TSV));

    expect(await searchAthletes("smith", 10)).toEqual([]);
    expect(await searchAthletes("smith", 10)).toMatchObject([
      { slug: "john-smith" },
      { slug: "sarah-smith" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns empty for queries shorter than two chars without fetching", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(await searchAthletes("a", 10)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("respects the limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(gzippedResponse(SMITH_TSV));
    expect(await searchAthletes("smith", 1)).toHaveLength(1);
  });

  it("matches accented names from an unaccented query (and vice versa)", async () => {
    const MULLER_TSV = [
      "alain-muller--fr-m\tMuller Alain\tFrance\tFR\t1",
      "beni-muller--ch-m\tMüller Beni\tSwitzerland\tCH\t2",
    ].join("\n");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(gzippedResponse(MULLER_TSV));

    expect(await searchAthletes("muller", 10)).toMatchObject([
      { slug: "alain-muller--fr-m" },
      { slug: "beni-muller--ch-m", fullName: "Müller Beni" },
    ]);

    // The accented query folds to the same "mu" bucket and shard.
    expect(await searchAthletes("müller", 10)).toMatchObject([
      { slug: "alain-muller--fr-m" },
      { slug: "beni-muller--ch-m" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/search-shards/6d75.tsv.gz",
      expect.anything(),
    );
  });
});
