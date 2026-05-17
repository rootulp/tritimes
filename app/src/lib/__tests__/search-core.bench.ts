import { bench, describe } from "vitest";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSearchKeys, searchAthletesInIndex, type IndexEntry } from "../search-core";

function loadFixture(): IndexEntry[] {
  const path = join(process.cwd(), "..", "data", "athlete-index.tsv.gz");
  const tsv = gunzipSync(readFileSync(path)).toString();
  const lines = tsv.split("\n");
  const entries: IndexEntry[] = [];
  for (const line of lines) {
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

const entries = loadFixture();
const keys = buildSearchKeys(entries);
const queries = ["jo", "smi", "rod", "ros", "anders", "wang", "li", "müller", "smith j", "garcia"];

describe("search-core", () => {
  bench(
    "searchAthletesInIndex (10 mixed queries)",
    () => {
      for (const q of queries) {
        searchAthletesInIndex(q, entries, keys, 10);
      }
    },
    { iterations: 1000 },
  );
});
