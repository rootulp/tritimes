import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { AthleteSearchEntry } from "@/lib/types";

interface IndexEntry extends AthleteSearchEntry {
  fullNameLower: string;
}

let cachedIndex: IndexEntry[] | null = null;

export function getSearchIndex(): IndexEntry[] {
  if (!cachedIndex) {
    const indexPath = path.join(
      process.cwd(),
      "..",
      "data",
      "athlete-index.json.gz",
    );
    const entries: IndexEntry[] = JSON.parse(
      gunzipSync(fs.readFileSync(indexPath)).toString(),
    );
    // Sort by fullNameLower for prefix-priority binary search
    entries.sort((a, b) => a.fullNameLower.localeCompare(b.fullNameLower));
    cachedIndex = entries;
  }
  return cachedIndex;
}

/**
 * Search athletes with prefix matches prioritized over substring matches.
 * Uses binary search for the common prefix case, then linear scan for substrings.
 */
export function searchAthletes(
  query: string,
  limit: number = 10,
): AthleteSearchEntry[] {
  const index = getSearchIndex();
  const q = query.toLowerCase();
  const results: AthleteSearchEntry[] = [];

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
    results.push({
      slug: entry.slug,
      fullName: entry.fullName,
      country: entry.country,
      countryISO: entry.countryISO,
      raceCount: entry.raceCount,
    });
  }

  if (results.length >= limit) return results;

  // Pass 2: Linear scan for substring (non-prefix) matches
  const prefixSlugs = new Set(results.map((r) => r.slug));
  for (const entry of index) {
    if (results.length >= limit) break;
    if (prefixSlugs.has(entry.slug)) continue;
    if (entry.fullNameLower.includes(q)) {
      results.push({
        slug: entry.slug,
        fullName: entry.fullName,
        country: entry.country,
        countryISO: entry.countryISO,
        raceCount: entry.raceCount,
      });
    }
  }

  return results;
}
