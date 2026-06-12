import { AthleteProfile } from "./types";

// Edge-compatible athlete-shard access for /athlete/[slug] (runtime = "edge").
// Uses only fetch — no fs/path/zlib — so it runs on the Edge runtime as well
// as Node (`next dev` / vitest). Keep Node-only modules (like data.ts) out of
// this file's import graph. The shards are stored gzipped but served with
// Content-Encoding: gzip (next.config.ts), so fetch decompresses them at the
// HTTP layer — DecompressionStream is NOT available in Next's edge sandbox.

export const SHARD_COUNT = 1024;

/**
 * Deterministic djb2 hash of an athlete slug → shard bucket.
 * MUST stay identical to scripts/build-athlete-shards.js (same algorithm,
 * same SHARD_COUNT) — see athlete-shards.test.ts for the parity anchor.
 */
export function shardId(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  }
  return h % SHARD_COUNT;
}

// Sharded, self-contained athlete profiles built at build time by
// scripts/build-athlete-shards.js and served as static assets under
// /athlete-shards/. A request fetches only the one shard it needs (~145KB)
// from the CDN — no 80MB profiles parse, no per-race CSV parsing. Shards are
// NOT bundled into the function; they ship as static files fetched over HTTP.
const shardCache = new Map<number, Record<string, AthleteProfile>>();

// Origin to fetch our own static shard assets from. On Vercel, VERCEL_URL is
// the current deployment's host; locally it's the dev/start server.
function shardOrigin(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

async function loadAthleteShard(id: number): Promise<Record<string, AthleteProfile>> {
  const cached = shardCache.get(id);
  if (cached) return cached;
  try {
    // On protected (preview) deployments the self-fetch is unauthenticated and
    // would 401; send the automation-bypass secret when Vercel provides it.
    // No-op in production, where deployments aren't protected.
    const headers: Record<string, string> = {};
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) headers["x-vercel-protection-bypass"] = bypass;
    // force-cache keeps this fetch in Next's data cache across requests.
    const res = await fetch(`${shardOrigin()}/athlete-shards/${id}.json.gz`, {
      cache: "force-cache",
      headers,
    });
    if (res.ok) {
      const shard = (await res.json()) as Record<string, AthleteProfile>;
      // Cache only on success — every shard exists, so a failure is transient
      // (network blip, cold CDN, 401 before bypass). Caching {} here would turn
      // a transient error into persistent "not found" for the whole shard until
      // the isolate recycles.
      shardCache.set(id, shard);
      return shard;
    }
  } catch {
    // Network/parse failure → fall through; don't cache, so the next request retries.
  }
  return {};
}

export async function getAthleteProfile(slug: string): Promise<AthleteProfile | null> {
  const shard = await loadAthleteShard(shardId(slug));
  return shard[slug] ?? null;
}
