// Builds everything the static site needs from data/ (the committed race CSVs):
//
//   public/data/race/<slug>.json.gz      per-race finisher columns (result pages, race distributions)
//   public/data/course/<course>.json.gz  pooled distribution arrays for combined course pages
//   public/data/athlete/<n>.json.gz      athlete profiles, 4096 shards
//   public/data/races.json.gz            raceSlug → [name, date] for athlete pages
//   public/search-shards/<hex>.tsv.gz    prefix search shards (scripts/build-search-shards.js)
//   .cache/pages/**                      small per-page JSON read by the Astro pages
//
// Run: npm run data (part of npm run build). Outputs are gitignored.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { gunzipSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { buildFineSearchShards } from "./build-fine-search";
import type { AthleteRaceEntry, CourseResult, RaceInfo } from "../src/lib/types";
import {
  buildRaceSegmentData,
  buildTopFinishers,
  computeRaceStats,
  getCourseYearSummary,
  parseResultsCSV,
  segmentLabels,
} from "../src/lib/stats";
import { encodeRaceFile } from "../src/lib/race-file";
import {
  ATHLETE_SHARD_COUNT,
  athleteShardId,
  packRaceEntry,
  type AthleteShard,
  type PackedProfile,
  type RaceIndex,
} from "../src/lib/athlete-file";
import { editionYear, groupCourses } from "../src/lib/races";
import type { CoursePageData, RacePageData, StatsPageData } from "../src/lib/page-data";

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(siteDir, "..");
const dataDir = path.join(repoDir, "data");
const publicData = path.join(siteDir, "public", "data");
const pagesDir = path.join(siteDir, ".cache", "pages");

const start = Date.now();
const log = (msg: string) => console.log(`[build-data ${((Date.now() - start) / 1000).toFixed(1)}s] ${msg}`);

for (const dir of [publicData, pagesDir]) fs.rmSync(dir, { recursive: true, force: true });
for (const dir of ["race", "course", "athlete"]) fs.mkdirSync(path.join(publicData, dir), { recursive: true });
for (const dir of ["race", "course"]) fs.mkdirSync(path.join(pagesDir, dir), { recursive: true });

const writeGz = (file: string, value: unknown) => fs.writeFileSync(file, gzipSync(JSON.stringify(value), { level: 9 }));
const writeJson = (file: string, value: unknown) => fs.writeFileSync(file, JSON.stringify(value));

const races: RaceInfo[] = JSON.parse(fs.readFileSync(path.join(dataDir, "races.json"), "utf-8")).map(
  (e: RaceInfo) => ({ slug: e.slug, name: e.name, date: e.date, location: e.location, finishers: e.finishers || 0 }),
);

function readResults(slug: string) {
  const file = path.join(dataDir, `${slug}.csv`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing CSV for race "${slug}"; refusing to publish incomplete results`);
  }
  return parseResultsCSV(fs.readFileSync(file, "utf-8"));
}

// Mirrors slugifyAthlete in scripts/build-athlete-shards.js (no null case) so
// athlete URLs stay identical to the production site.
function athleteSlug(fullName: string, countryISO: string, gender: string): string {
  const base = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}--${countryISO.toLowerCase()}-${gender.toLowerCase().charAt(0)}`;
}

function countGreater(sortedAsc: number[], x: number): number {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return sortedAsc.length - lo;
}

// Pass 1 (manifest order): race files, race pages, athlete profiles.
const athletes = new Map<string, { fullName: string; country: string; countryISO: string; races: AthleteRaceEntry[] }>();
const raceIndex: RaceIndex = {};
for (const race of races) {
  raceIndex[race.slug] = [race.name, race.date];
  const results = readResults(race.slug);
  writeGz(path.join(publicData, "race", `${race.slug}.json.gz`), encodeRaceFile(race, results));

  const page: RacePageData = {
    race,
    stats: computeRaceStats(results),
    ...segmentLabels(results.map((r) => r.gender), results.map((r) => r.ageGroup)),
  };
  writeJson(path.join(pagesDir, "race", `${race.slug}.json`), page);

  const sortedFinish = results.map((r) => r.finishSeconds).filter((s) => s > 0).sort((a, b) => a - b);
  const distance = race.slug.startsWith("im703-") ? "70.3" : "140.6";
  for (const r of results) {
    const slug = athleteSlug(r.fullName, r.countryISO, r.gender);
    let profile = athletes.get(slug);
    if (!profile) {
      profile = { fullName: r.fullName, country: r.country, countryISO: r.countryISO, races: [] };
      athletes.set(slug, profile);
    }
    // Last seen wins, as in the production shards.
    profile.fullName = r.fullName;
    profile.country = r.country;
    profile.countryISO = r.countryISO;
    profile.races.push({
      raceSlug: race.slug,
      raceName: race.name,
      raceDate: race.date,
      resultId: r.id,
      finishTime: r.finishTime,
      finishSeconds: r.finishSeconds,
      overallPercentile: sortedFinish.length > 0
        ? Math.round((countGreater(sortedFinish, r.finishSeconds) / sortedFinish.length) * 100)
        : 0,
      distance,
      ageGroup: r.ageGroup,
      swimTime: r.swimTime,
      bikeTime: r.bikeTime,
      runTime: r.runTime,
      swimSeconds: r.swimSeconds,
      bikeSeconds: r.bikeSeconds,
      runSeconds: r.runSeconds,
    });
  }
}
log(`${races.length} races → race files + race pages; ${athletes.size} athletes`);

// Athlete shards: entries newest first, packed to arrays.
const shards: AthleteShard[] = Array.from({ length: ATHLETE_SHARD_COUNT }, () => ({}));
for (const [slug, p] of athletes) {
  p.races.sort((a, b) => b.raceDate.localeCompare(a.raceDate));
  const packed: PackedProfile = [p.fullName, p.country, p.countryISO, p.races.map(packRaceEntry)];
  shards[athleteShardId(slug)][slug] = packed;
}
shards.forEach((shard, i) => writeGz(path.join(publicData, "athlete", `${i}.json.gz`), shard));
writeGz(path.join(publicData, "races.json.gz"), raceIndex);
athletes.clear();
log(`${ATHLETE_SHARD_COUNT} athlete shards`);

// Pass 2 (per course): combined course pages and their pooled distributions.
const courses = groupCourses(races);
for (const [course, info] of courses) {
  const pool: CourseResult[] = [];
  for (const e of info.editions) {
    for (const r of readResults(e.slug)) pool.push({ ...r, raceSlug: e.slug, year: editionYear(e.slug) });
  }
  const stats = computeRaceStats(pool);
  stats.maleLeaderboard = buildTopFinishers(pool, "Male");
  stats.femaleLeaderboard = buildTopFinishers(pool, "Female");
  const segments = buildRaceSegmentData(pool);
  writeGz(path.join(publicData, "course", `${course}.json.gz`), segments);
  const page: CoursePageData = {
    info,
    stats,
    yearSummary: getCourseYearSummary(pool),
    genders: segments.genders,
    ageBands: segments.ageBands,
  };
  writeJson(path.join(pagesDir, "course", `${course}.json`), page);
}
log(`${courses.size} courses`);

// /stats page aggregates (ported from getStatsPageData in app/src/lib/data.ts).
{
  const sorted = [...races].sort((a, b) => a.date.localeCompare(b.date));
  const ironmanCourses = new Set<string>();
  const halfCourses = new Set<string>();
  let ironmanRaceCount = 0;
  let halfIronmanRaceCount = 0;
  const im703Locations = new Map<string, number>();
  const imLocations = new Map<string, number>();
  const years = new Map<string, number>();
  for (const r of races) {
    const base = r.slug.replace(/-\d{4}$/, "");
    const half = r.slug.startsWith("im703-");
    (half ? halfCourses : ironmanCourses).add(base);
    if (half) halfIronmanRaceCount++;
    else ironmanRaceCount++;
    if (r.location) {
      const counts = half ? im703Locations : imLocations;
      counts.set(r.location, (counts.get(r.location) || 0) + 1);
    }
    const year = r.date.substring(0, 4);
    years.set(year, (years.get(year) || 0) + 1);
  }
  const top = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
  const byFinishers = [...races].sort((a, b) => b.finishers - a.finishers);
  const withFinishers = byFinishers.filter((r) => r.finishers > 0);
  const largest = byFinishers[0];
  const smallest = withFinishers[withFinishers.length - 1];

  const index = gunzipSync(fs.readFileSync(path.join(dataDir, "athlete-index.tsv.gz"))).toString().split("\n");
  let uniqueAthletes = 0;
  let repeatAthletes = 0;
  let topAthlete = { slug: "", fullName: "N/A", raceCount: 0 };
  for (const line of index) {
    if (!line) continue;
    uniqueAthletes++;
    const [slug, fullName, , , count] = line.split("\t");
    const raceCount = +count;
    if (raceCount > 1) repeatAthletes++;
    if (raceCount > topAthlete.raceCount) topAthlete = { slug, fullName, raceCount };
  }

  const [loc703, count703] = top(im703Locations);
  const [locIM, countIM] = top(imLocations);
  const [topYear, topYearCount] = top(years);
  const stats: StatsPageData = {
    raceCount: races.length,
    totalResults: races.reduce((sum, r) => sum + r.finishers, 0),
    uniqueAthletes,
    ironmanCourseCount: ironmanCourses.size,
    halfIronmanCourseCount: halfCourses.size,
    earliestRace: { slug: sorted[0].slug, name: sorted[0].name, date: sorted[0].date },
    mostRecentRace: { slug: sorted.at(-1)!.slug, name: sorted.at(-1)!.name, date: sorted.at(-1)!.date },
    largestRace: { slug: largest.slug, name: largest.name, finishers: largest.finishers },
    smallestRace: { slug: smallest.slug, name: smallest.name, finishers: smallest.finishers },
    avgParticipants: races.length > 0 ? Math.round(races.reduce((s, r) => s + r.finishers, 0) / races.length) : 0,
    locationMost703: { location: loc703 as string, count: count703 as number },
    locationMostIM: { location: locIM as string, count: countIM as number },
    yearWithMostRaces: { year: topYear as string, count: topYearCount as number },
    ironmanRaceCount,
    halfIronmanRaceCount,
    repeatAthletes,
    athleteWithMostRaces: topAthlete,
  };
  writeJson(path.join(pagesDir, "stats.json"), stats);
}

execFileSync(
  process.execPath,
  [path.join(repoDir, "scripts", "build-search-shards.js"), "--out", path.join(siteDir, "public", "search-shards")],
  { stdio: "inherit" },
);
const fineSearch = buildFineSearchShards(path.join(siteDir, "public", "search-shards"), path.join(siteDir, ".cache", "search-partitions.json"));
log(`${fineSearch.shards} fine search shards for ${fineSearch.parents} large prefixes`);
log("done");
