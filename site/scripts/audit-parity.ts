/**
 * Compare built static payloads against the existing Next.js data layer.
 * Run after both data pipelines: npm run audit (from site/).
 * Assertions deliberately use ../app's implementation as the oracle.
 */
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import * as legacy from "../../app/src/lib/data";
import { getResult, disciplineHistogram, raceFileSegments, type RaceFile } from "../src/lib/race-file";
import { athleteShardId, unpackProfile, type AthleteShard, type RaceIndex } from "../src/lib/athlete-file";
import type { AthleteProfile, RaceInfo } from "../src/lib/types";

const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8"));
const readGz = <T>(file: string): T => JSON.parse(gunzipSync(fs.readFileSync(file)).toString());
const races = read<RaceInfo[]>("../data/races.json");
const hash = createHash("sha256");
hash.update(fs.readFileSync("../data/races.json"));
hash.update(fs.readFileSync("../data/athlete-index.tsv.gz"));
let resultsChecked = 0;
let histogramComparisons = 0;
let profilesChecked = 0;
let profileResultsChecked = 0;
let searchShardsChecked = 0;
const start = Date.now();

for (const race of races) {
  hash.update(fs.readFileSync(`../data/${race.slug}.csv`));
  const original = legacy.getAllResults(race.slug);
  const file = readGz<RaceFile>(`public/data/race/${race.slug}.json.gz`);
  assert.deepEqual(file.id, original.map((r) => r.id), `${race.slug}: stable result URLs`);
  for (const row of original) {
    const restored = getResult(file, row.id)!;
    // First/last names aren't stored separately; every displayed field is.
    const { firstName: _first, lastName: _last, ...expected } = row;
    const { firstName: _f, lastName: _l, ...actual } = restored;
    assert.deepEqual(actual, expected, `${race.slug}/result/${row.id}`);
    resultsChecked++;
  }
  const page = read<{ stats: unknown }>(`.cache/pages/race/${race.slug}.json`);
  assert.deepEqual(page.stats, legacy.getRaceStats(race.slug), `${race.slug}: statistics and leaderboards`);
  assert.deepEqual(raceFileSegments(file), legacy.getRaceSegmentData(race.slug), `${race.slug}: filter arrays`);
  // Beginning, middle and end of every race, all six disciplines and both scopes.
  const sample = [...new Set([0, Math.floor(original.length / 2), original.length - 1])];
  for (const index of sample) {
    const athlete = original[index];
    if (!athlete) continue;
    for (const discipline of ["swim", "bike", "run", "finish", "t1", "t2"] as const) {
      for (const scope of ["overall", "ageGroup"] as const) {
        assert.deepEqual(disciplineHistogram(file, athlete, discipline, scope),
          legacy.getDisciplineHistogram(race.slug, athlete, discipline, scope),
          `${race.slug}/${athlete.id}: ${discipline}/${scope}`);
        histogramComparisons++;
      }
    }
  }
}
console.log(`Verified ${resultsChecked} results across ${races.length} races`);

// Each old shard maps to exactly four new shards (same hash, 1024 → 4096).
const raceIndex = readGz<RaceIndex>("public/data/races.json.gz");
for (let i = 0; i < 1024; i++) {
  const original = readGz<Record<string, AthleteProfile>>(`../app/public/athlete-shards/${i}.json.gz`);
  const shards = new Map<number, AthleteShard>();
  for (const id of [i, i + 1024, i + 2048, i + 3072]) {
    shards.set(id, readGz<AthleteShard>(`public/data/athlete/${id}.json.gz`));
  }
  const oldSlugs = Object.keys(original).sort();
  const newSlugs = [...shards.values()].flatMap((s) => Object.keys(s)).sort();
  assert.deepEqual(newSlugs, oldSlugs, `athlete shard ${i}: no added or missing profiles`);
  for (const [slug, profile] of Object.entries(original)) {
    const restored = unpackProfile(slug, shards.get(athleteShardId(slug))![slug], raceIndex);
    assert.deepEqual(restored, profile, `athlete/${slug}`);
    profilesChecked++;
    profileResultsChecked += profile.races.length;
  }
}

const courses = fs.readdirSync(".cache/pages/course");
for (const course of courses) {
  const page = read<{ info: { editions: { slug: string }[] }; stats: unknown; yearSummary: unknown }>(`.cache/pages/course/${course}`);
  const results = legacy.getCourseResults(page.info.editions.map((e) => e.slug));
  const stats = legacy.computeRaceStats(results);
  stats.maleLeaderboard = legacy.buildTopFinishers(results, "Male");
  stats.femaleLeaderboard = legacy.buildTopFinishers(results, "Female");
  assert.deepEqual(page.stats, stats, `${course}: pooled statistics`);
  assert.deepEqual(page.yearSummary, legacy.getCourseYearSummary(results), `${course}: year summaries`);
  assert.deepEqual(readGz(`public/data/course/${course}.gz`), legacy.buildRaceSegmentData(results), `${course}: filters`);
}
for (const file of fs.readdirSync("../app/public/search-shards").filter((f) => f.endsWith(".gz"))) {
  assert.deepEqual(fs.readFileSync(`public/search-shards/${file}`), fs.readFileSync(`../app/public/search-shards/${file}`), file);
  searchShardsChecked++;
}
assert.equal(fs.readdirSync("public/search-shards").filter((f) => f.endsWith(".gz")).length, searchShardsChecked);
const report = {
  checkedAt: new Date().toISOString(),
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  corpusSha256: hash.digest("hex"),
  races: races.length, resultsChecked, profilesChecked, profileResultsChecked,
  courses: courses.length, histogramComparisons, searchShardsChecked,
  durationSeconds: (Date.now() - start) / 1000,
  assertions: "All displayed result fields and stable IDs; complete athlete profiles; race/course statistics, leaderboards and segment arrays; sampled result histograms; byte-identical search shards",
};
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync(path.join("artifacts", "parity.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
