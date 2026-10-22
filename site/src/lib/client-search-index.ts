import type { AthleteSearchEntry } from "@/lib/types";
import {
  buildSearchKeys,
  foldName,
  searchAthletesInIndex,
  searchBucket,
  shardFileName,
  type IndexEntry,
  type SearchKey,
} from "@/lib/search-core";

export interface ClientSearchShard {
  entries: IndexEntry[];
  keys: SearchKey[];
  loadStats: { downloadMs: number; parseMs: number; bytes: number };
}

export function parseIndexTsv(tsv: string): IndexEntry[] {
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
      fullNameLower: foldName(fullName),
      country: line.substring(t2 + 1, t3),
      countryISO: line.substring(t3 + 1, t4),
      raceCount: +line.substring(t4 + 1),
    });
  }
  return entries;
}

// One cached load per 2-char bucket. A failed load is evicted so the next
// keystroke retries it.
const shardPromises = new Map<string, Promise<ClientSearchShard>>();

/**
 * Load the search shard covering `query` (the static asset for its first two
 * normalized chars). Returns null when the query is too short to search.
 * A 404 means no athlete has that prefix and resolves to an empty shard.
 */
export function loadShardForQuery(query: string): Promise<ClientSearchShard> | null {
  const bucket = searchBucket(query);
  if (bucket === null) return null;
  let promise = shardPromises.get(bucket);
  if (!promise) {
    promise = doLoadShard(bucket);
    promise.catch(() => shardPromises.delete(bucket));
    shardPromises.set(bucket, promise);
  }
  return promise;
}

async function doLoadShard(bucket: string, fine = false): Promise<ClientSearchShard> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream not supported");
  }

  const downloadStart = performance.now();
  const response = await fetch(`/search-shards/${fine ? "fine/" : ""}${shardFileName(bucket)}`);
  if (response.status === 404) {
    // No athlete name (or token rotation) starts with this prefix.
    return { entries: [], keys: [], loadStats: { downloadMs: 0, parseMs: 0, bytes: 0 } };
  }
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch search shard: ${response.status}`);
  }

  const decompressed = response.body.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const tsv = await new Response(decompressed).text();
  const downloadMs = performance.now() - downloadStart;
  const bytes = tsv.length;

  const parseStart = performance.now();
  const entries = parseIndexTsv(tsv);
  const keys = buildSearchKeys(entries);
  const parseMs = performance.now() - parseStart;

  return { entries, keys, loadStats: { downloadMs, parseMs, bytes } };
}

export function searchAthletesInShard(
  query: string,
  shard: ClientSearchShard,
  limit: number = 10,
): AthleteSearchEntry[] {
  return searchAthletesInIndex(query, shard.entries, shard.keys, limit);
}

const finePromises = new Map<string, Promise<ClientSearchShard>>();

/** Use a smaller partition for longer queries; retain the original substring fallback. */
export async function searchAthletes(query: string, limit = 10): Promise<AthleteSearchEntry[]> {
  const normalized = foldName(query).trim().replace(/\s+/g, " ");
  const parent = searchBucket(query);
  if (!parent) return [];
  const fineBuckets = typeof __FINE_SEARCH_BUCKETS__ === "undefined" ? [] : __FINE_SEARCH_BUCKETS__;
  if (normalized.length >= 3 && fineBuckets.includes(parent)) {
    let prefix = parent;
    while (prefix.length < normalized.length && fineBuckets.includes(prefix)) {
      prefix = normalized.slice(0, prefix.length + 1);
    }
    let promise = finePromises.get(prefix);
    if (!promise) {
      promise = doLoadShard(prefix, true);
      promise.catch(() => finePromises.delete(prefix));
      finePromises.set(prefix, promise);
    }
    try {
      const shard = await promise;
      // A substring-only hit in this subset must not hide earlier hits from
      // the base file. Only prefix matches can be answered by the partition.
      if (shard.keys.some(({ key }) => key.startsWith(normalized))) {
        return searchAthletesInShard(query, shard, limit);
      }
    } catch {
      // A stale/missing fine file or download failure can still use the base shard.
    }
  }
  const shard = await loadShardForQuery(query);
  return shard ? searchAthletesInShard(query, shard, limit) : [];
}

// Test seam: reset memoization. Not exported through the package barrel.
export function __resetForTests() {
  shardPromises.clear();
  finePromises.clear();
}
