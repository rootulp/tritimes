import { gunzipSync } from "zlib";
import { AthleteSearchEntry } from "@/lib/types";
import {
  buildSearchKeys,
  searchAthletesInIndex as searchAthletesInIndexCore,
  searchBucket,
  shardFileName,
  type IndexEntry,
  type SearchKey,
} from "@/lib/search-core";

export type { IndexEntry, SearchKey } from "@/lib/search-core";

interface SearchShard {
  entries: IndexEntry[];
  keys: SearchKey[];
}

const EMPTY_SHARD: SearchShard = { entries: [], keys: [] };

// Prefix shards built by scripts/build-search-shards.js and served as static
// assets under /search-shards/. A query fetches only the shard for its first
// two normalized chars (~0.2KB–1MB gz) — no 9.7MB / 820K-row index parse on
// cold boot. Shards are NOT bundled into the function; like the athlete
// shards in data.ts, they ship as static files fetched over HTTP.
const shardCache = new Map<string, SearchShard>();

// Origin to fetch our own static shard assets from. On Vercel, VERCEL_URL is
// the current deployment's host; locally it's the dev/start server.
function shardOrigin(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

async function loadSearchShard(bucket: string): Promise<SearchShard> {
  const cached = shardCache.get(bucket);
  if (cached) return cached;
  try {
    // On protected (preview) deployments the self-fetch is unauthenticated and
    // would 401; send the automation-bypass secret when Vercel provides it.
    // No-op in production, where deployments aren't protected.
    const headers: Record<string, string> = {};
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) headers["x-vercel-protection-bypass"] = bypass;
    const res = await fetch(`${shardOrigin()}/search-shards/${shardFileName(bucket)}`, {
      cache: "force-cache",
      headers,
    });
    if (res.status === 404) {
      // No athlete name (or token rotation) starts with this prefix — a
      // definitive answer, safe to cache.
      shardCache.set(bucket, EMPTY_SHARD);
      return EMPTY_SHARD;
    }
    if (res.ok) {
      const tsv = gunzipSync(Buffer.from(await res.arrayBuffer())).toString();
      const entries = parseShardTsv(tsv);
      const shard: SearchShard = { entries, keys: buildSearchKeys(entries) };
      // Cache only on success — other failures are transient (network blip,
      // cold CDN, 401 before bypass) and should retry on the next request.
      shardCache.set(bucket, shard);
      return shard;
    }
  } catch {
    // Network/parse failure → fall through; don't cache, so the next request retries.
  }
  return EMPTY_SHARD;
}

function parseShardTsv(tsv: string): IndexEntry[] {
  const lines = tsv.split("\n");
  const entries: IndexEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const t1 = line.indexOf("\t");
    const t2 = line.indexOf("\t", t1 + 1);
    const t3 = line.indexOf("\t", t2 + 1);
    const t4 = line.indexOf("\t", t3 + 1);
    const fullName = line.substring(t1 + 1, t2);
    entries.push({
      slug: line.substring(0, t1),
      fullName,
      fullNameLower: fullName.toLowerCase(),
      country: line.substring(t2 + 1, t3),
      countryISO: line.substring(t3 + 1, t4),
      raceCount: +line.substring(t4 + 1),
    });
  }
  return entries;
}

export function searchAthletesInIndex(
  query: string,
  index: IndexEntry[],
  limit: number = 10,
): AthleteSearchEntry[] {
  return searchAthletesInIndexCore(query, index, buildSearchKeys(index), limit);
}

export async function searchAthletes(
  query: string,
  limit: number = 10,
): Promise<AthleteSearchEntry[]> {
  const bucket = searchBucket(query);
  if (bucket === null) return [];
  const shard = await loadSearchShard(bucket);
  return searchAthletesInIndexCore(query, shard.entries, shard.keys, limit);
}

// Test seam: reset the per-bucket cache.
export function __resetForTests() {
  shardCache.clear();
}
