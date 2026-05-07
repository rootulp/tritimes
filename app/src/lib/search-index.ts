import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { AthleteSearchEntry } from "@/lib/types";

export interface IndexEntry extends AthleteSearchEntry {
  fullNameLower: string;
}

interface SearchKey {
  key: string;
  index: number;
}

let cachedIndex: IndexEntry[] | null = null;
let cachedSearchKeys: SearchKey[] | null = null;

export function getSearchIndex(): IndexEntry[] {
  if (!cachedIndex) {
    const indexPath = path.join(
      process.cwd(),
      "..",
      "data",
      "athlete-index.tsv.gz",
    );
    const tsv = gunzipSync(fs.readFileSync(indexPath)).toString();
    const lines = tsv.split("\n");
    const entries: IndexEntry[] = new Array(lines.length);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const t1 = line.indexOf("\t");
      const t2 = line.indexOf("\t", t1 + 1);
      const t3 = line.indexOf("\t", t2 + 1);
      const t4 = line.indexOf("\t", t3 + 1);
      const fullName = line.substring(t1 + 1, t2);
      entries[i] = {
        slug: line.substring(0, t1),
        fullName,
        fullNameLower: fullName.toLowerCase(),
        country: line.substring(t2 + 1, t3),
        countryISO: line.substring(t3 + 1, t4),
        raceCount: +line.substring(t4 + 1),
      };
    }
    // Index is pre-sorted by fullNameLower at build time
    cachedIndex = entries.filter(Boolean);
    cachedSearchKeys = buildSearchKeys(cachedIndex);
  }
  return cachedIndex;
}

function toSearchResult(entry: IndexEntry): AthleteSearchEntry {
  return {
    slug: entry.slug,
    fullName: entry.fullName,
    country: entry.country,
    countryISO: entry.countryISO,
    raceCount: entry.raceCount,
  };
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

function getNameTokens(name: string): string[] {
  return name.split(/[\s-]+/).filter(Boolean);
}

function buildSearchKeys(index: IndexEntry[]): SearchKey[] {
  const keys: SearchKey[] = [];
  for (let i = 0; i < index.length; i++) {
    const entry = index[i];
    const tokens = getNameTokens(entry.fullNameLower);
    const entryKeys = new Set<string>([entry.fullNameLower]);

    for (let tokenIndex = 1; tokenIndex < tokens.length; tokenIndex++) {
      entryKeys.add(
        [...tokens.slice(tokenIndex), ...tokens.slice(0, tokenIndex)].join(" "),
      );
    }

    for (const key of entryKeys) {
      keys.push({ key, index: i });
    }
  }

  return keys.sort((a, b) => {
    const keyCompare = a.key.localeCompare(b.key);
    return keyCompare || a.index - b.index;
  });
}

function getSearchKeys(): SearchKey[] {
  if (!cachedSearchKeys) {
    cachedSearchKeys = buildSearchKeys(getSearchIndex());
  }
  return cachedSearchKeys;
}

function addMatch(
  results: AthleteSearchEntry[],
  seenSlugs: Set<string>,
  entry: IndexEntry,
  limit: number,
): boolean {
  if (seenSlugs.has(entry.slug)) return results.length >= limit;
  seenSlugs.add(entry.slug);
  results.push(toSearchResult(entry));
  return results.length >= limit;
}

function findFirstKeyAtLeast(keys: SearchKey[], query: string): number {
  let lo = 0;
  let hi = keys.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (keys[mid].key < query) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * Search athletes with prefix matches prioritized over substring matches.
 * Uses binary search over full names and rotated name-token keys, then keeps a
 * linear substring scan as a compatibility fallback.
 */
export function searchAthletesInIndex(
  query: string,
  index: IndexEntry[],
  limit: number = 10,
): AthleteSearchEntry[] {
  const q = normalizeQuery(query);
  if (!q) return [];

  const results: AthleteSearchEntry[] = [];
  const seenSlugs = new Set<string>();

  // Pass 1: Binary search for prefix matches in sorted index
  let lo = 0;
  let hi = index.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (index[mid].fullNameLower < q) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // lo is now the first entry >= q; scan forward for prefix matches
  for (let i = lo; i < index.length && results.length < limit; i++) {
    const entry = index[i];
    if (!entry.fullNameLower.startsWith(q)) break;
    addMatch(results, seenSlugs, entry, limit);
  }

  if (results.length >= limit) return results;

  // Pass 2: Binary search rotated token keys, e.g. "smith john".
  const keys = index === cachedIndex ? getSearchKeys() : buildSearchKeys(index);
  const keyStart = findFirstKeyAtLeast(keys, q);
  for (let i = keyStart; i < keys.length && results.length < limit; i++) {
    const searchKey = keys[i];
    if (!searchKey.key.startsWith(q)) break;
    addMatch(results, seenSlugs, index[searchKey.index], limit);
  }

  if (results.length > 0) return results;

  // Pass 3: Linear scan for substring (non-prefix) matches.
  for (const entry of index) {
    if (results.length >= limit) break;
    if (seenSlugs.has(entry.slug)) continue;
    if (entry.fullNameLower.includes(q)) {
      addMatch(results, seenSlugs, entry, limit);
    }
  }

  return results;
}

export function searchAthletes(
  query: string,
  limit: number = 10,
): AthleteSearchEntry[] {
  return searchAthletesInIndex(query, getSearchIndex(), limit);
}
