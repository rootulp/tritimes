import { AthleteSearchEntry } from "@/lib/types";

export interface IndexEntry extends AthleteSearchEntry {
  /** Match field: lowercased AND diacritic-folded — see foldName(). */
  fullNameLower: string;
}

export interface SearchKey {
  key: string;
  index: number;
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

// Lowercase letters with no NFD decomposition that still need ASCII folding.
const FOLD_SPECIALS: Record<string, string> = {
  "æ": "ae",
  "œ": "oe",
  "ø": "o",
  "ß": "ss",
  "đ": "d",
  "ð": "d",
  "þ": "th",
  "ł": "l",
};

/**
 * Lowercase a name and fold diacritics for search matching: NFD-strip
 * combining marks (ü→u, é→e, å→a) plus the special cases above (æ→ae, ø→o,
 * ß→ss, …). Applied to indexed names, shard keys, and queries alike so
 * "muller" matches "Müller" and vice versa. Display names stay accented —
 * only match fields are folded.
 * MUST stay identical to foldName() in scripts/build-search-shards.js — see
 * search-shards.test.ts.
 */
export function foldName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[æœøßđðþł]/g, (ch) => FOLD_SPECIALS[ch]);
}

function normalizeQuery(query: string): string {
  return foldName(query).trim().replace(/\s+/g, " ");
}

/**
 * The 2-char shard bucket a query is served from, or null when the
 * normalized query is too short to search (minimum 2 chars).
 * MUST stay consistent with bucketsForName() in
 * scripts/build-search-shards.js — see search-shards.test.ts.
 */
export function searchBucket(query: string): string | null {
  const q = normalizeQuery(query);
  if (q.length < 2) return null;
  return q.slice(0, 2);
}

/**
 * Static-asset file name for a shard bucket: UTF-8 hex of the bucket chars,
 * sidestepping URL/filesystem encoding of spaces and non-ASCII.
 * MUST stay identical to shardFileName() in scripts/build-search-shards.js.
 */
export function shardFileName(bucket: string): string {
  let hex = "";
  for (const byte of new TextEncoder().encode(bucket)) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return `${hex}.tsv.gz`;
}

function getNameTokens(name: string): string[] {
  return name.split(/[\s-]+/).filter(Boolean);
}

export function buildSearchKeys(index: IndexEntry[]): SearchKey[] {
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

  // Code-unit sort (not localeCompare) so the order agrees with the
  // `<` comparisons in findFirstKeyAtLeast's binary search.
  return keys.sort((a, b) => {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return a.index - b.index;
  });
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
 *
 * Preconditions: `index` must be sorted by `fullNameLower`; `keys` must have
 * been produced by `buildSearchKeys(index)` over the same index instance.
 */
export function searchAthletesInIndex(
  query: string,
  index: IndexEntry[],
  keys: SearchKey[],
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
  for (let i = lo; i < index.length && results.length < limit; i++) {
    const entry = index[i];
    if (!entry.fullNameLower.startsWith(q)) break;
    addMatch(results, seenSlugs, entry, limit);
  }

  if (results.length >= limit) return results;

  // Pass 2: Binary search rotated token keys, e.g. "smith john".
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
