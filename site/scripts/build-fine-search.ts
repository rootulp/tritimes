/** Adaptive longer-prefix partitions for large shards; base files stay identical. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { gzipSync, gunzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const { foldName, searchKeysForName, shardFileName } = require("../../scripts/build-search-shards.js") as {
  foldName: (name: string) => string;
  searchKeysForName: (name: string) => string[];
  shardFileName: (prefix: string) => string;
};
export const FINE_SEARCH_THRESHOLD = 128 * 1024;

export function partitionSearchLines(lines: string[], parent: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  // Parent files are already sorted; filtering retains the search ranking order.
  for (const line of lines) {
    if (!line) continue;
    const name = foldName(line.split("\t")[1]);
    const length = parent.length + 1;
    const prefixes = new Set(searchKeysForName(name).filter((key) => key.startsWith(parent) && key.length >= length).map((key) => key.slice(0, length)));
    for (const prefix of prefixes) {
      const entries = result.get(prefix) ?? [];
      entries.push(line);
      result.set(prefix, entries);
    }
  }
  return result;
}

export function buildFineSearchShards(directory: string, manifestPath: string) {
  const fineDir = path.join(directory, "fine");
  fs.rmSync(fineDir, { recursive: true, force: true });
  fs.mkdirSync(fineDir, { recursive: true });
  const parents: string[] = [];
  let count = 0;
  function split(lines: string[], parent: string) {
    parents.push(parent);
    for (const [prefix, entries] of partitionSearchLines(lines, parent)) {
      const bytes = gzipSync(entries.join("\n"));
      fs.writeFileSync(path.join(fineDir, shardFileName(prefix)), bytes);
      count++;
      if (bytes.length >= FINE_SEARCH_THRESHOLD && prefix.length < 8) split(entries, prefix);
    }
  }
  for (const file of fs.readdirSync(directory).filter((file) => file.endsWith(".tsv.gz")).sort()) {
    const original = fs.readFileSync(path.join(directory, file));
    if (original.length < FINE_SEARCH_THRESHOLD) continue;
    const parent = Buffer.from(file.replace(/\.tsv.gz$/, ""), "hex").toString();
    split(gunzipSync(original).toString().split("\n"), parent);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(parents));
  return { parents: parents.length, shards: count };
}
