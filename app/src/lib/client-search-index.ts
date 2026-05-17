import { AthleteSearchEntry } from "@/lib/types";
import {
  buildSearchKeys,
  searchAthletesInIndex,
  type IndexEntry,
  type SearchKey,
} from "@/lib/search-core";

export interface ClientSearchIndex {
  entries: IndexEntry[];
  keys: SearchKey[];
  loadStats: { downloadMs: number; parseMs: number; bytes: number };
}

const SEARCH_INDEX_URL = "/athlete-index.tsv.gz";

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
      fullNameLower: fullName.toLowerCase(),
      country: line.substring(t2 + 1, t3),
      countryISO: line.substring(t3 + 1, t4),
      raceCount: +line.substring(t4 + 1),
    });
  }
  return entries;
}

let loadPromise: Promise<ClientSearchIndex> | null = null;

export function loadSearchIndex(): Promise<ClientSearchIndex> {
  if (loadPromise) return loadPromise;
  loadPromise = doLoadSearchIndex().catch((err) => {
    // Keep the rejection cached so callers see the same error and we don't
    // retry on every keystroke. The hook treats this as "stay on API path".
    return Promise.reject(err);
  });
  return loadPromise;
}

async function doLoadSearchIndex(): Promise<ClientSearchIndex> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream not supported");
  }

  const downloadStart = performance.now();
  const response = await fetch(SEARCH_INDEX_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch search index: ${response.status}`);
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

export function searchAthletesInClientIndex(
  query: string,
  index: ClientSearchIndex,
  limit: number = 10,
): AthleteSearchEntry[] {
  return searchAthletesInIndex(query, index.entries, index.keys, limit);
}

// Test seam: reset memoization. Not exported through the package barrel.
export function __resetForTests() {
  loadPromise = null;
}
