import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shardId, SHARD_COUNT } from "@/lib/athlete-shards";
import type { AthleteProfile } from "@/lib/types";
import { createRequire } from "module";
const nodeRequire = createRequire(import.meta.url);
const buildShards = nodeRequire("../../../../scripts/build-athlete-shards.js");

describe("shardId", () => {
  it("is deterministic and within range", () => {
    const slugs = [
      "smith-anderson--us-m",
      "miller-argent--au-m",
      "garcia-araceli-del-rocio--mx-f",
      "",
    ];
    for (const slug of slugs) {
      const id = shardId(slug);
      expect(id).toBe(shardId(slug));
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(SHARD_COUNT);
      expect(Number.isInteger(id)).toBe(true);
    }
  });

  it("matches pinned values (build/runtime parity anchor)", () => {
    expect(SHARD_COUNT).toBe(1024);
    // Hardcoded so any drift in the djb2 algorithm (here or in the build
    // script copy) is caught — do NOT recompute these from the function.
    expect(shardId("smith-anderson--us-m")).toBe(621);
    expect(shardId("miller-argent--au-m")).toBe(546);
  });
});

describe("build script parity + records", () => {
  it("script shardId matches athlete-shards.ts shardId", () => {
    for (const slug of ["smith-anderson--us-m", "miller-argent--au-m", "a--gb-f"]) {
      expect(buildShards.shardId(slug)).toBe(shardId(slug));
    }
  });

  it("buildAthleteRecords aggregates races, precomputes percentile, sorts by date desc", () => {
    const races = [
      { slug: "im703-test-2025", name: "IM 70.3 Test 2025", date: "2025-06-01" },
      { slug: "im-test-2024", name: "IM Test 2024", date: "2024-06-01" },
    ];
    const header =
      "FullName,Country,CountryISO,Gender,Status,AgeGroup,FinishTime,FinishSeconds,SwimTime,SwimSeconds,BikeTime,BikeSeconds,RunTime,RunSeconds";
    const csv = {
      "im703-test-2025": [
        header,
        "Ann Lee,United States,US,Female,Finisher,F30-34,5:00:00,18000,0:30:00,1800,2:30:00,9000,2:00:00,7200",
        "Bob Roe,United States,US,Male,Finisher,M30-34,6:00:00,21600,0:35:00,2100,3:00:00,10800,2:25:00,8700",
        "Cy Doe,United States,US,Male,Finisher,M30-34,7:00:00,25200,0:40:00,2400,3:30:00,12600,2:50:00,10200",
      ].join("\n"),
      "im-test-2024": [
        header,
        "Ann Lee,United States,US,Female,Finisher,F30-34,5:30:00,19800,0:32:00,1920,2:40:00,9600,2:18:00,8280",
      ].join("\n"),
    };
    const records = buildShards.buildAthleteRecords(races, (slug) => csv[slug] ?? null);
    const annSlug = buildShards.slugifyAthlete("Ann Lee", "US", "Female");
    const ann = records.get(annSlug);

    expect(ann.fullName).toBe("Ann Lee");
    expect(ann.country).toBe("United States");
    expect(ann.countryISO).toBe("US");
    expect(ann.races.map((r) => r.raceSlug)).toEqual(["im703-test-2025", "im-test-2024"]);
    // 2025 race: Ann (18000s) beat 2 of 3 finishers → 67%.
    expect(ann.races[0].overallPercentile).toBe(67);
    expect(ann.races[0].distance).toBe("70.3");
    expect(ann.races[0].resultId).toBe(0);
    expect(ann.races[0].raceName).toBe("IM 70.3 Test 2025");
    expect(ann.races[0].swimSeconds).toBe(1800);
    // 2024 race: Ann is the only finisher → beat 0 others → 0%.
    expect(ann.races[1].overallPercentile).toBe(0);
    expect(ann.races[1].distance).toBe("140.6");
  });
});

describe("getAthleteProfile (edge-compatible fetch)", () => {
  const SLUG = "ann-lee--us-f";

  function makeProfile(slug: string): AthleteProfile {
    return { slug, fullName: "Ann Lee", country: "United States", countryISO: "US", races: [] };
  }

  // Shards are stored gzipped but served with Content-Encoding: gzip (see
  // next.config.ts), so fetch hands the module already-decompressed JSON —
  // which is what this mock returns.
  function shardResponse(shard: Record<string, AthleteProfile>): Response {
    return new Response(JSON.stringify(shard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // The module memoizes shards in a module-level Map, so each test re-imports
  // a fresh copy to start with an empty cache.
  async function freshModule() {
    vi.resetModules();
    return await import("@/lib/athlete-shards");
  }

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fetches the slug's shard and returns the profile", async () => {
    const shard = { [SLUG]: makeProfile(SLUG) };
    const fetchMock = vi.fn(async () => shardResponse(shard));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    const profile = await mod.getAthleteProfile(SLUG);

    expect(profile).toEqual(makeProfile(SLUG));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain(`/athlete-shards/${mod.shardId(SLUG)}.json.gz`);
  });

  it("returns null when the slug is not in its shard", async () => {
    const fetchMock = vi.fn(async () => shardResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    expect(await mod.getAthleteProfile(SLUG)).toBeNull();
  });

  it("memoizes the shard: a second lookup does not refetch", async () => {
    const shard = { [SLUG]: makeProfile(SLUG) };
    const fetchMock = vi.fn(async () => shardResponse(shard));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    await mod.getAthleteProfile(SLUG);
    await mod.getAthleteProfile(SLUG);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed load — the next lookup retries", async () => {
    const shard = { [SLUG]: makeProfile(SLUG) };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 401 }))
      .mockResolvedValueOnce(shardResponse(shard));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    expect(await mod.getAthleteProfile(SLUG)).toBeNull();
    expect(await mod.getAthleteProfile(SLUG)).toEqual(makeProfile(SLUG));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null (and does not throw) on network failure", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    expect(await mod.getAthleteProfile(SLUG)).toBeNull();
  });

  it("fetches from VERCEL_URL and sends the protection-bypass header when set", async () => {
    vi.stubEnv("VERCEL_URL", "my-preview.vercel.app");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "sekret");
    const fetchMock = vi.fn(async () => shardResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    await mod.getAthleteProfile(SLUG);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://my-preview.vercel.app/athlete-shards/${mod.shardId(SLUG)}.json.gz`,
    );
    expect((init.headers as Record<string, string>)["x-vercel-protection-bypass"]).toBe("sekret");
    expect(init.cache).toBe("force-cache");
  });

  it("falls back to localhost with PORT when VERCEL_URL is unset", async () => {
    vi.stubEnv("PORT", "4321");
    const fetchMock = vi.fn(async () => shardResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const mod = await freshModule();
    await mod.getAthleteProfile(SLUG);

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe(`http://localhost:4321/athlete-shards/${mod.shardId(SLUG)}.json.gz`);
  });
});
