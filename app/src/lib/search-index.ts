import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { AthleteSearchEntry } from "@/lib/types";
import {
  buildSearchKeys,
  searchAthletesInIndex as searchAthletesInIndexCore,
  type IndexEntry,
  type SearchKey,
} from "@/lib/search-core";

export type { IndexEntry, SearchKey } from "@/lib/search-core";

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
    cachedIndex = entries.filter(Boolean);
    cachedSearchKeys = buildSearchKeys(cachedIndex);
  }
  return cachedIndex;
}

function getSearchKeys(): SearchKey[] {
  if (!cachedSearchKeys) {
    cachedSearchKeys = buildSearchKeys(getSearchIndex());
  }
  return cachedSearchKeys;
}

export function searchAthletesInIndex(
  query: string,
  index: IndexEntry[],
  limit: number = 10,
): AthleteSearchEntry[] {
  const keys = index === cachedIndex ? getSearchKeys() : buildSearchKeys(index);
  return searchAthletesInIndexCore(query, index, keys, limit);
}

export function searchAthletes(
  query: string,
  limit: number = 10,
): AthleteSearchEntry[] {
  return searchAthletesInIndex(query, getSearchIndex(), limit);
}
