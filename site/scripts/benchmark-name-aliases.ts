/** Compare real-corpus search with a pre-change commit. Run from site/:
 * node --import tsx scripts/benchmark-name-aliases.ts <baseline-commit>
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import * as currentCore from "../src/lib/search-core";
import { parseIndexTsv } from "../src/lib/client-search-index";
import { FINE_SEARCH_THRESHOLD, shouldPartitionSearch } from "./build-fine-search";

const baselineRef = process.argv[2];
assert(baselineRef, "Pass the pre-change Git commit as the first argument");
const root = path.resolve(import.meta.dirname, "../..");
const baselineCommit = execFileSync("git", ["rev-parse", baselineRef], { cwd: root, encoding: "utf8" }).trim();
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "tritimes-alias-benchmark-"));
const require = createRequire(import.meta.url);
const queries = ["alex ogura", "tom edwards", "alexander ogura", "thomas edwards", "al", "to", "tom", "rootul patel", "smith j", "muller", "zzzz-no-match"];
const percentile = (samples: number[], p: number) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1];

try {
  for (const [source, destination] of [
    ["site/src/lib/search-core.ts", "search-core.ts"],
    ["scripts/build-search-shards.js", "build-search-shards.cjs"],
  ]) {
    fs.writeFileSync(path.join(temporary, destination), execFileSync("git", ["show", `${baselineCommit}:${source}`], { cwd: root }));
  }
  const baselineCore: typeof currentCore = await import(pathToFileURL(path.join(temporary, "search-core.ts")).href);
  const lines = gunzipSync(fs.readFileSync(path.join(root, "data/athlete-index.tsv.gz"))).toString().split("\n").filter(Boolean);
  const variants = [
    { name: "before", core: baselineCore, builder: require(path.join(temporary, "build-search-shards.cjs")) },
    { name: "after", core: currentCore, builder: require("../../scripts/build-search-shards.js") },
  ];
  const measurements: Record<string, unknown>[] = [];
  const results = new Map<string, string[]>();
  for (const { name, core, builder } of variants) {
    const shards: Map<string, string[]> = builder.buildShardMap(lines);
    for (const query of queries) {
      let prefix = core.searchBucket(query)!;
      let selected = shards.get(prefix) ?? [];
      const parentGzipBytes = gzipSync(selected.join("\n")).length;
      // Mirror adaptive partition selection using each version's own keys.
      while (prefix.length < query.length && prefix.length < 8 && (name === "after"
        ? shouldPartitionSearch(prefix, gzipSync(selected.join("\n")).length)
        : gzipSync(selected.join("\n")).length >= FINE_SEARCH_THRESHOLD)) {
        prefix = query.slice(0, prefix.length + 1);
        selected = selected.filter((line) => builder.searchKeysForName(core.foldName(line.split("\t")[1])).some((key: string) => key.startsWith(prefix)));
      }
      const entries = parseIndexTsv(selected.join("\n"));
      const keyBuildMs: number[] = [];
      for (let i = 0; i < 9; i++) {
        const start = performance.now();
        core.buildSearchKeys(entries);
        keyBuildMs.push(performance.now() - start);
      }
      const keys = core.buildSearchKeys(entries);
      for (let i = 0; i < 100; i++) core.searchAthletesInIndex(query, entries, keys);
      const lookupMs: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        core.searchAthletesInIndex(query, entries, keys);
        lookupMs.push(performance.now() - start);
      }
      const slugs = core.searchAthletesInIndex(query, entries, keys).map((entry) => entry.slug);
      results.set(`${name}:${query}`, slugs);
      measurements.push({ version: name, query, partition: prefix, parentGzipBytes, gzipBytes: gzipSync(selected.join("\n")).length, entries: entries.length, keys: keys.length, keyBuildMedianMs: percentile(keyBuildMs, 0.5), lookupMedianMs: percentile(lookupMs, 0.5), lookupP95Ms: percentile(lookupMs, 0.95), slugs });
    }
  }
  assert(results.get("after:alex ogura")!.includes("alexander-ogura--us-m"));
  assert(results.get("after:tom edwards")!.includes("thomas-edwards--us-m"));
  for (const query of queries.slice(2)) assert.deepEqual(results.get(`after:${query}`), results.get(`before:${query}`), `Existing result order changed: ${query}`);
  const report = { baselineCommit, node: process.version, corpusEntries: lines.length, lookupSamples: 1000, keyBuildSamples: 9, note: "Local CPU microbenchmark; fine-partition sizes exclude HTTP overhead. No-match queries may additionally load the parent in the browser. Not production latency or a substitute for browser tests.", measurements };
  fs.mkdirSync("artifacts/name-aliases", { recursive: true });
  fs.writeFileSync("artifacts/name-aliases/benchmark.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
