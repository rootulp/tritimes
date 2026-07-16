import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { AggregateStats, AthleteResult, AthleteSearchEntry, AgeGroupBreakdown, CourseStats, DisciplineStats, DistanceStats, GenderBreakdown, HistogramBin, HistogramData, LeaderboardEntry, RaceHistogramData, RaceSegmentData, RaceStats } from "./types";
import { getRaces } from "./races";
import {
  BIN_SIZES,
  computeMedian,
  computeRaceHistogram,
  deriveAgeBand,
  formatSecondsShort,
  type Discipline,
} from "./histogram";

export type { Discipline } from "./histogram";
export { BIN_SIZES, computeRaceHistogram } from "./histogram";

// Corpus-reading data access: everything here may reference data/*.csv.gz,
// data/histograms/* and data/athlete-index.tsv.gz, so any function whose
// import graph reaches this module gets the whole ~190MB corpus copied into
// its traced bundle. Routes that only need the race manifest must import
// @/lib/races instead (enforced by import-graph.test.ts; see #216).

// Manifest accessors are re-exported so corpus-reading routes (race/result
// pages) can keep importing everything from @/lib/data.
export { getRaces, getRaceBySlug, getGlobalStats } from "./races";

const cache = new Map<string, AthleteResult[]>();

/**
 * Parse RFC 4180 CSV text into rows of string arrays.
 * Handles quoted fields that contain newlines, commas, and escaped quotes.
 */
export function parseCSVRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < raw.length && raw[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r" && i + 1 < raw.length && raw[i + 1] === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += 2;
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Flush last field/row
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseCSV(raceSlug: string): AthleteResult[] {
  const cached = cache.get(raceSlug);
  if (cached) return cached;

  const gzPath = path.join(process.cwd(), "..", "data", `${raceSlug}.csv.gz`);
  if (!fs.existsSync(gzPath)) return [];

  const raw = gunzipSync(fs.readFileSync(gzPath)).toString("utf-8");
  const rows = parseCSVRows(raw);
  if (rows.length === 0) return [];

  const headers = rows[0];
  const results: AthleteResult[] = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    if (row.Status !== "Finisher") continue;

    results.push({
      id: i - 1, // 0-based row index
      firstName: row.FirstName,
      lastName: row.LastName,
      fullName: row.FullName,
      bib: row.Bib,
      ageGroup: row.AgeGroup,
      gender: row.Gender,
      city: row.City,
      state: row.State,
      country: row.Country,
      countryISO: row.CountryISO,
      swimTime: row.SwimTime,
      bikeTime: row.BikeTime,
      runTime: row.RunTime,
      t1Time: row.T1Time,
      t2Time: row.T2Time,
      finishTime: row.FinishTime,
      swimSeconds: Number(row.SwimSeconds) || 0,
      bikeSeconds: Number(row.BikeSeconds) || 0,
      runSeconds: Number(row.RunSeconds) || 0,
      t1Seconds: Number(row.T1Seconds) || 0,
      t2Seconds: Number(row.T2Seconds) || 0,
      finishSeconds: Number(row.FinishSeconds) || 0,
      overallRank: Number(row.OverallRank) || 0,
      genderRank: Number(row.GenderRank) || 0,
      ageGroupRank: Number(row.AgeGroupRank) || 0,
      status: row.Status,
    });
  }

  cache.set(raceSlug, results);
  return results;
}

export function getAllResults(raceSlug: string): AthleteResult[] {
  return parseCSV(raceSlug);
}

export function getGenderCount(raceSlug: string, gender: string): number {
  return getAllResults(raceSlug).filter((r) => r.gender === gender).length;
}

export function getAgeGroupCount(raceSlug: string, ageGroup: string): number {
  return getAllResults(raceSlug).filter((r) => r.ageGroup === ageGroup).length;
}

export function getAthleteById(raceSlug: string, id: number): AthleteResult | undefined {
  return getAllResults(raceSlug).find((r) => r.id === id);
}

export function getAllIds(raceSlug: string): number[] {
  return getAllResults(raceSlug).map((r) => r.id);
}

let athleteIndexCache: AthleteSearchEntry[] | null = null;

export function getDeduplicatedAthleteIndex(): AthleteSearchEntry[] {
  if (athleteIndexCache) return athleteIndexCache;

  const indexPath = path.join(process.cwd(), "..", "data", "athlete-index.tsv.gz");
  const tsv = gunzipSync(fs.readFileSync(indexPath)).toString();
  const entries: AthleteSearchEntry[] = [];
  for (const line of tsv.split("\n")) {
    if (!line) continue;
    const t1 = line.indexOf("\t");
    const t2 = line.indexOf("\t", t1 + 1);
    const t3 = line.indexOf("\t", t2 + 1);
    const t4 = line.indexOf("\t", t3 + 1);
    entries.push({
      slug: line.substring(0, t1),
      fullName: line.substring(t1 + 1, t2),
      country: line.substring(t2 + 1, t3),
      countryISO: line.substring(t3 + 1, t4),
      raceCount: +line.substring(t4 + 1),
    });
  }
  athleteIndexCache = entries;
  return athleteIndexCache;
}

let courseStatsCache: CourseStats[] | null = null;

export function getCourseStats(): CourseStats[] {
  if (!courseStatsCache) {
    const statsPath = path.join(process.cwd(), "..", "data", "course-stats.json.gz");
    courseStatsCache = JSON.parse(gunzipSync(fs.readFileSync(statsPath)).toString());
  }
  return courseStatsCache!;
}

let distanceStatsCache: Record<"70.3" | "140.6", DistanceStats> | null = null;

export function getDistanceStats(distance: "70.3" | "140.6"): DistanceStats {
  if (!distanceStatsCache) {
    const statsPath = path.join(process.cwd(), "..", "data", "distance-stats.json.gz");
    distanceStatsCache = JSON.parse(gunzipSync(fs.readFileSync(statsPath)).toString());
  }
  return distanceStatsCache![distance];
}

let aggregateStatsCache: AggregateStats | null = null;

function loadAggregateStats(): AggregateStats {
  if (!aggregateStatsCache) {
    const statsPath = path.join(process.cwd(), "..", "data", "aggregate-stats.json.gz");
    aggregateStatsCache = JSON.parse(gunzipSync(fs.readFileSync(statsPath)).toString());
  }
  return aggregateStatsCache!;
}

export interface StatsPageData {
  raceCount: number;
  totalResults: number;
  uniqueAthletes: number;
  ironmanCourseCount: number;
  halfIronmanCourseCount: number;
  earliestRace: { slug: string; name: string; date: string };
  mostRecentRace: { slug: string; name: string; date: string };
  // Group A: from races.json
  largestRace: { slug: string; name: string; finishers: number };
  smallestRace: { slug: string; name: string; finishers: number };
  avgParticipants: number;
  locationMost703: { location: string; count: number };
  locationMostIM: { location: string; count: number };
  yearWithMostRaces: { year: string; count: number };
  ironmanRaceCount: number;
  halfIronmanRaceCount: number;
  // Group B: from athlete index
  repeatAthletes: number;
  athleteWithMostRaces: { slug: string; fullName: string; raceCount: number };
  // Group C: from aggregate-stats.json.gz
  aggregate: AggregateStats;
}

export function getStatsPageData(): StatsPageData {
  const races = getRaces();
  const sorted = [...races].sort((a, b) => a.date.localeCompare(b.date));
  const earliest = sorted[0];
  const mostRecent = sorted[sorted.length - 1];

  const ironmanCourses = new Set<string>();
  const halfIronmanCourses = new Set<string>();
  let ironmanRaceCount = 0;
  let halfIronmanRaceCount = 0;
  for (const r of races) {
    const base = r.slug.replace(/-\d{4}$/, "");
    if (r.slug.startsWith("im703-")) {
      halfIronmanCourses.add(base);
      halfIronmanRaceCount++;
    } else {
      ironmanCourses.add(base);
      ironmanRaceCount++;
    }
  }

  // Group A: largest/smallest race
  const sortedByFinishers = [...races].sort((a, b) => b.finishers - a.finishers);
  const largest = sortedByFinishers[0];
  const racesWithFinishers = sortedByFinishers.filter(r => r.finishers > 0);
  const smallest = racesWithFinishers[racesWithFinishers.length - 1];

  const avgParticipants = races.length > 0
    ? Math.round(races.reduce((sum, r) => sum + r.finishers, 0) / races.length)
    : 0;

  // Location counts
  const im703LocationCounts = new Map<string, number>();
  const imLocationCounts = new Map<string, number>();
  const yearCounts = new Map<string, number>();
  for (const r of races) {
    const loc = r.location;
    if (loc) {
      if (r.slug.startsWith("im703-")) {
        im703LocationCounts.set(loc, (im703LocationCounts.get(loc) || 0) + 1);
      } else {
        imLocationCounts.set(loc, (imLocationCounts.get(loc) || 0) + 1);
      }
    }
    const year = r.date.substring(0, 4);
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
  }

  const topIM703Location = Array.from(im703LocationCounts.entries()).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
  const topIMLocation = Array.from(imLocationCounts.entries()).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
  const topYear = Array.from(yearCounts.entries()).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

  // Group B: repeat athletes and most-raced athlete
  const athleteIndex = getDeduplicatedAthleteIndex();
  let repeatAthletes = 0;
  let topAthlete: AthleteSearchEntry = { slug: "", fullName: "N/A", country: "", countryISO: "", raceCount: 0 };
  for (const a of athleteIndex) {
    if (a.raceCount > 1) repeatAthletes++;
    if (a.raceCount > topAthlete.raceCount) topAthlete = a;
  }

  return {
    raceCount: races.length,
    totalResults: races.reduce((sum, r) => sum + r.finishers, 0),
    uniqueAthletes: athleteIndex.length,
    ironmanCourseCount: ironmanCourses.size,
    halfIronmanCourseCount: halfIronmanCourses.size,
    earliestRace: { slug: earliest.slug, name: earliest.name, date: earliest.date },
    mostRecentRace: { slug: mostRecent.slug, name: mostRecent.name, date: mostRecent.date },
    largestRace: { slug: largest.slug, name: largest.name, finishers: largest.finishers },
    smallestRace: { slug: smallest.slug, name: smallest.name, finishers: smallest.finishers },
    avgParticipants,
    locationMost703: { location: topIM703Location[0] as string, count: topIM703Location[1] as number },
    locationMostIM: { location: topIMLocation[0] as string, count: topIMLocation[1] as number },
    yearWithMostRaces: { year: topYear[0] as string, count: topYear[1] as number },
    ironmanRaceCount,
    halfIronmanRaceCount,
    repeatAthletes,
    athleteWithMostRaces: { slug: topAthlete.slug, fullName: topAthlete.fullName, raceCount: topAthlete.raceCount },
    aggregate: loadAggregateStats(),
  };
}

export function computeHistogram(
  allSeconds: number[],
  athleteSeconds: number,
  binSize: number
): HistogramData {
  const valid = allSeconds.filter((s) => s > 0);
  if (valid.length === 0) {
    return { bins: [], athleteSeconds, athletePercentile: 0, medianSeconds: 0 };
  }

  const min = Math.floor(Math.min(...valid) / binSize) * binSize;
  const max = Math.ceil(Math.max(...valid) / binSize) * binSize;

  const bins: HistogramBin[] = [];
  for (let start = min; start < max; start += binSize) {
    const end = start + binSize;
    const count = valid.filter((s) => s >= start && s < end).length;
    const isAthlete = athleteSeconds >= start && athleteSeconds < end;
    bins.push({
      label: formatSecondsShort(start),
      rangeStart: start,
      rangeEnd: end,
      count,
      isAthlete,
    });
  }

  // Percentile: percentage of finishers the athlete beat (higher = better).
  // Left unrounded so the display layer (formatPercentile) can distinguish
  // e.g. 99.95% (winner, shown as ">99%") from a true 100%.
  const slowerCount = valid.filter((s) => s > athleteSeconds).length;
  const athletePercentile = (slowerCount / valid.length) * 100;

  const medianSeconds = computeMedian(valid);

  return { bins, athleteSeconds, athletePercentile, medianSeconds };
}

function getSeconds(r: AthleteResult, discipline: Discipline): number {
  switch (discipline) {
    case "swim": return r.swimSeconds;
    case "bike": return r.bikeSeconds;
    case "run": return r.runSeconds;
    case "finish": return r.finishSeconds;
    case "t1": return r.t1Seconds;
    case "t2": return r.t2Seconds;
  }
}

// Precomputed histogram cache: slug → discipline data
const histogramCache = new Map<string, Record<string, { overall: PrecomputedBins; perAgeGroup: Record<string, PrecomputedBins> }>>();

interface PrecomputedBin {
  label: string;
  rangeStart: number;
  rangeEnd: number;
  count: number;
}

interface PrecomputedBins {
  bins: PrecomputedBin[];
  medianSeconds: number;
  totalAthletes: number;
}

function loadPrecomputedHistograms(raceSlug: string) {
  const cached = histogramCache.get(raceSlug);
  if (cached) return cached;

  const histPath = path.join(process.cwd(), "..", "data", "histograms", `${raceSlug}.json.gz`);
  if (!fs.existsSync(histPath)) return null;

  const data = JSON.parse(gunzipSync(fs.readFileSync(histPath)).toString());
  histogramCache.set(raceSlug, data);
  return data;
}

// Async variant for streaming server components: the awaited disk I/O gives
// React's renderer a yield point so the parent shell can flush before the
// downstream sync histogram work runs.
export async function preloadHistograms(raceSlug: string): Promise<void> {
  if (histogramCache.has(raceSlug)) return;

  const histPath = path.join(process.cwd(), "..", "data", "histograms", `${raceSlug}.json.gz`);
  try {
    const buf = await fs.promises.readFile(histPath);
    const data = JSON.parse(gunzipSync(buf).toString());
    histogramCache.set(raceSlug, data);
  } catch {
    // File missing — getDisciplineHistogram will fall back to on-demand compute
  }
}

export function getDisciplineHistogram(
  raceSlug: string,
  athlete: AthleteResult,
  discipline: Discipline,
  scope: "overall" | "ageGroup"
): HistogramData {
  const athleteSeconds = getSeconds(athlete, discipline);

  // Try precomputed data first
  const precomputed = loadPrecomputedHistograms(raceSlug);
  if (precomputed && precomputed[discipline]) {
    const source = scope === "ageGroup"
      ? precomputed[discipline].perAgeGroup[athlete.ageGroup]
      : precomputed[discipline].overall;

    if (source && source.bins.length > 0) {
      const bins: HistogramBin[] = source.bins.map((b: PrecomputedBin) => ({
        label: b.label,
        rangeStart: b.rangeStart,
        rangeEnd: b.rangeEnd,
        count: b.count,
        isAthlete: athleteSeconds >= b.rangeStart && athleteSeconds < b.rangeEnd,
      }));

      const slowerCount = source.bins.reduce(
        (sum: number, b: PrecomputedBin) => sum + (b.rangeStart > athleteSeconds ? b.count : 0),
        0
      );
      // Unrounded — display rounding/capping happens in formatPercentile.
      const athletePercentile = source.totalAthletes > 0
        ? (slowerCount / source.totalAthletes) * 100
        : 0;

      return { bins, athleteSeconds, athletePercentile, medianSeconds: source.medianSeconds };
    }
  }

  // Fallback to on-demand computation
  let pool = getAllResults(raceSlug);
  if (scope === "ageGroup") {
    pool = pool.filter((r) => r.ageGroup === athlete.ageGroup);
  }

  const allSeconds = pool.map((r) => getSeconds(r, discipline));
  return computeHistogram(allSeconds, athleteSeconds, BIN_SIZES[discipline]);
}

export function getRaceStats(raceSlug: string): RaceStats {
  const results = getAllResults(raceSlug);

  const disciplineKeys: { key: Discipline; label: string }[] = [
    { key: "swim", label: "Swim" },
    { key: "bike", label: "Bike" },
    { key: "run", label: "Run" },
    { key: "finish", label: "Total" },
  ];

  const disciplines: DisciplineStats[] = disciplineKeys.map(({ key, label }) => {
    const values = results.map((r) => getSeconds(r, key)).filter((s) => s > 0);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? sum / values.length : 0;
    const sorted = [...values].sort((a, b) => a - b);
    const median = computeMedian(values);
    return {
      discipline: label,
      fastest: sorted[0] || 0,
      slowest: sorted[sorted.length - 1] || 0,
      median,
      average: Math.round(avg),
    };
  });

  // Gender breakdown
  const genderMap = new Map<string, AthleteResult[]>();
  for (const r of results) {
    const list = genderMap.get(r.gender) || [];
    list.push(r);
    genderMap.set(r.gender, list);
  }
  const genderBreakdown: GenderBreakdown[] = Array.from(genderMap.entries())
    .map(([gender, group]) => {
      const finishes = group.map((r) => r.finishSeconds).filter((s) => s > 0);
      const sorted = [...finishes].sort((a, b) => a - b);
      return {
        gender,
        count: group.length,
        percentage: Math.round((group.length / results.length) * 100),
        medianFinish: computeMedian(finishes),
        fastestFinish: sorted[0] || 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Age group breakdown
  const ageGroupMap = new Map<string, AthleteResult[]>();
  for (const r of results) {
    const list = ageGroupMap.get(r.ageGroup) || [];
    list.push(r);
    ageGroupMap.set(r.ageGroup, list);
  }
  const ageGroupBreakdown: AgeGroupBreakdown[] = Array.from(ageGroupMap.entries())
    .map(([ageGroup, group]) => {
      const finishes = group.map((r) => r.finishSeconds).filter((s) => s > 0);
      const sorted = [...finishes].sort((a, b) => a - b);
      return {
        ageGroup,
        count: group.length,
        percentage: Math.round((group.length / results.length) * 100),
        medianFinish: computeMedian(finishes),
        fastestFinish: sorted[0] || 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Top 10 leaderboards by gender
  function buildLeaderboard(gender: string): LeaderboardEntry[] {
    return results
      .filter((r) => r.gender === gender)
      .sort((a, b) => a.genderRank - b.genderRank)
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        rank: r.genderRank,
        fullName: r.fullName,
        country: r.country,
        countryISO: r.countryISO,
        ageGroup: r.ageGroup,
        gender: r.gender,
        finishTime: r.finishTime,
        swimTime: r.swimTime,
        bikeTime: r.bikeTime,
        runTime: r.runTime,
      }));
  }
  const maleLeaderboard = buildLeaderboard("Male");
  const femaleLeaderboard = buildLeaderboard("Female");

  // Histograms — use precomputed data if available
  const precomputed = loadPrecomputedHistograms(raceSlug);
  const histograms = (() => {
    if (precomputed) {
      const toRaceHistogram = (key: Discipline): RaceHistogramData => {
        const src = precomputed[key]?.overall;
        if (!src || src.bins.length === 0) {
          return computeRaceHistogram(results.map((r) => getSeconds(r, key)), BIN_SIZES[key]);
        }
        return {
          bins: src.bins.map((b: PrecomputedBin) => ({
            label: b.label,
            rangeStart: b.rangeStart,
            rangeEnd: b.rangeEnd,
            count: b.count,
            isAthlete: false,
          })),
          medianSeconds: src.medianSeconds,
          totalAthletes: src.totalAthletes,
        };
      };
      return {
        swim: toRaceHistogram("swim"),
        bike: toRaceHistogram("bike"),
        run: toRaceHistogram("run"),
        finish: toRaceHistogram("finish"),
      };
    }
    return {
      swim: computeRaceHistogram(results.map((r) => r.swimSeconds), BIN_SIZES.swim),
      bike: computeRaceHistogram(results.map((r) => r.bikeSeconds), BIN_SIZES.bike),
      run: computeRaceHistogram(results.map((r) => r.runSeconds), BIN_SIZES.run),
      finish: computeRaceHistogram(results.map((r) => r.finishSeconds), BIN_SIZES.finish),
    };
  })();

  return {
    totalFinishers: results.length,
    disciplines,
    genderBreakdown,
    ageGroupBreakdown,
    maleLeaderboard,
    femaleLeaderboard,
    histograms,
  };
}

// Numeric-first ordering: bands with a leading age (e.g. "18-24") sort by that
// age ascending; non-numeric bands (e.g. "PRO") come after, alphabetically.
function compareAgeBands(a: string, b: string): number {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  const aNum = !Number.isNaN(na);
  const bNum = !Number.isNaN(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return a.localeCompare(b);
}

export function getRaceSegmentData(raceSlug: string): RaceSegmentData {
  const results = getAllResults(raceSlug);

  // Build ordered label tables first.
  const GENDER_ORDER: Record<string, number> = { Male: 0, Female: 1 };
  const genders = Array.from(new Set(results.map((r) => r.gender)))
    .filter((g) => g)
    .sort((a, b) => {
      const ra = GENDER_ORDER[a] ?? 2;
      const rb = GENDER_ORDER[b] ?? 2;
      return ra !== rb ? ra - rb : a.localeCompare(b);
    });
  const ageBands = Array.from(
    new Set(results.map((r) => deriveAgeBand(r.ageGroup)))
  )
    .filter((b) => b)
    .sort(compareAgeBands);

  const genderPos = new Map(genders.map((g, i) => [g, i]));
  const bandPos = new Map(ageBands.map((b, i) => [b, i]));

  const swim: number[] = [];
  const bike: number[] = [];
  const run: number[] = [];
  const finish: number[] = [];
  const genderIdx: number[] = [];
  const ageBandIdx: number[] = [];

  for (const r of results) {
    swim.push(r.swimSeconds);
    bike.push(r.bikeSeconds);
    run.push(r.runSeconds);
    finish.push(r.finishSeconds);
    genderIdx.push(genderPos.get(r.gender) ?? -1);
    ageBandIdx.push(bandPos.get(deriveAgeBand(r.ageGroup)) ?? -1);
  }

  return { swim, bike, run, finish, genderIdx, ageBandIdx, genders, ageBands };
}
