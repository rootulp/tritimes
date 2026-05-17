import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseIndexTsv, loadSearchIndex, __resetForTests } from "../client-search-index";
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

describe("loadSearchIndex memoization", () => {
  beforeEach(() => {
    __resetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the index only once across concurrent callers", async () => {
    const tsv = "john-smith\tJohn Smith\tUnited States\tUS\t4";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeGzippedResponse(tsv));

    const [a, b] = await Promise.all([loadSearchIndex(), loadSearchIndex()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a.entries.map((e) => e.slug)).toEqual(["john-smith"]);
  });

  it("caches a rejection so callers do not retry", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network"));

    await expect(loadSearchIndex()).rejects.toThrow("network");
    await expect(loadSearchIndex()).rejects.toThrow("network");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
