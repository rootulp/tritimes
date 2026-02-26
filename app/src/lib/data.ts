import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { AggregateStats, AthleteResult, AthleteProfile, AthleteRaceEntry, AthleteSearchEntry, AgeGroupBreakdown, CourseStats, DisciplineStats, GenderBreakdown, HistogramBin, HistogramData, LeaderboardEntry, RaceHistogramData, RaceInfo, RaceStats } from "./types";

interface RaceManifestEntry {
  slug: string;
  name: string;
  date: string;
  location: string;
  eventId: string;
  finishers: number;
}

function loadRaces(): RaceInfo[] {
  const manifestPath = path.join(process.cwd(), "..", "data", "races.json");
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const entries: RaceManifestEntry[] = JSON.parse(raw);
  return entries.map((e) => ({
    slug: e.slug,
    name: e.name,
    date: e.date,
    location: e.location,
    finishers: e.finishers || 0,
  }));
}

let racesCache: RaceInfo[] | null = null;
function getRacesInternal(): RaceInfo[] {
  if (!racesCache) racesCache = loadRaces();
  return racesCache;
}

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

export function getRaces(): RaceInfo[] {
  return getRacesInternal();
}

export function getRaceBySlug(slug: string): RaceInfo | undefined {
  return getRacesInternal().find((r) => r.slug === slug);
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

  const indexPath = path.join(process.cwd(), "..", "data", "athlete-index.json.gz");
  athleteIndexCache = JSON.parse(gunzipSync(fs.readFileSync(indexPath)).toString());
  return athleteIndexCache!;
}

// Compact mapping: slug → [[raceSlug, resultId], ...]
type ProfilesMapping = Record<string, [string, number][]>;

let profilesMappingCache: ProfilesMapping | null = null;

function getProfilesMapping(): ProfilesMapping {
  if (!profilesMappingCache) {
    const profilesPath = path.join(process.cwd(), "..", "data", "athlete-profiles.json.gz");
    profilesMappingCache = JSON.parse(gunzipSync(fs.readFileSync(profilesPath)).toString());
  }
  return profilesMappingCache!;
}

export function getAthleteProfile(slug: string): AthleteProfile | null {
  const mapping = getProfilesMapping();
  const refs = mapping[slug];
  if (!refs || refs.length === 0) return null;

  const raceMap = new Map(getRacesInternal().map((r) => [r.slug, r]));
  const races: AthleteRaceEntry[] = [];
  let fullName = "";
  let country = "";
  let countryISO = "";

  for (const [raceSlug, resultId] of refs) {
    const race = raceMap.get(raceSlug);
    const result = getAthleteById(raceSlug, resultId);
    if (!race || !result) continue;

    fullName = result.fullName;
    country = result.country;
    countryISO = result.countryISO;

    const allFinishTimes = getAllResults(raceSlug).map((r) => r.finishSeconds).filter((s) => s > 0);
    const slowerCount = allFinishTimes.filter((s) => s > result.finishSeconds).length;
    const overallPercentile = allFinishTimes.length > 0
      ? Math.round((slowerCount / allFinishTimes.length) * 100)
      : 0;
    const distance: "70.3" | "140.6" = raceSlug.startsWith("im703-") ? "70.3" : "140.6";

    races.push({
      raceSlug: race.slug,
      raceName: race.name,
      raceDate: race.date,
      resultId: result.id,
      finishTime: result.finishTime,
      finishSeconds: result.finishSeconds,
      overallPercentile,
      distance,
      ageGroup: result.ageGroup,
      swimTime: result.swimTime,
      bikeTime: result.bikeTime,
      runTime: result.runTime,
      swimSeconds: result.swimSeconds,
      bikeSeconds: result.bikeSeconds,
      runSeconds: result.runSeconds,
    });
  }

  if (races.length === 0) return null;

  races.sort((a, b) => b.raceDate.localeCompare(a.raceDate));

  return { slug, fullName, country, countryISO, races };
}

let courseStatsCache: CourseStats[] | null = null;

export function getCourseStats(): CourseStats[] {
  if (!courseStatsCache) {
    const statsPath = path.join(process.cwd(), "..", "data", "course-stats.json.gz");
    courseStatsCache = JSON.parse(gunzipSync(fs.readFileSync(statsPath)).toString());
  }
  return courseStatsCache!;
}

export function getGlobalStats(): { raceCount: number; totalResults: number } {
  const manifestPath = path.join(process.cwd(), "..", "data", "races.json");
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const entries: RaceManifestEntry[] = JSON.parse(raw);
  return {
    raceCount: entries.length,
    totalResults: entries.reduce((sum, e) => sum + (e.finishers || 0), 0),
  };
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
  const races = getRacesInternal();
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
  const smallest = sortedByFinishers[sortedByFinishers.length - 1];

  const avgParticipants = races.length > 0
    ? Math.round(races.reduce((sum, r) => sum + r.finishers, 0) / races.length)
    : 0;

  // Location counts
  const im703LocationCounts = new Map<string, number>();
  const imLocationCounts = new Map<string, number>();
  const yearCounts = new Map<string, number>();
  for (const r of races) {
    const loc = r.location;
    if (r.slug.startsWith("im703-")) {
      im703LocationCounts.set(loc, (im703LocationCounts.get(loc) || 0) + 1);
    } else {
      imLocationCounts.set(loc, (imLocationCounts.get(loc) || 0) + 1);
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

function formatSecondsShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}m`;
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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

  // Percentile: percentage of finishers the athlete beat (higher = better)
  const slowerCount = valid.filter((s) => s > athleteSeconds).length;
  const athletePercentile = Math.round((slowerCount / valid.length) * 100);

  const medianSeconds = computeMedian(valid);

  return { bins, athleteSeconds, athletePercentile, medianSeconds };
}

export type Discipline = "swim" | "bike" | "run" | "finish" | "t1" | "t2";

const BIN_SIZES: Record<Discipline, number> = {
  swim: 300,    // 5-minute bins
  bike: 600,    // 10-minute bins
  run: 600,     // 10-minute bins
  finish: 600,  // 10-minute bins
  t1: 60,       // 1-minute bins
  t2: 60,       // 1-minute bins
};

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
      const athletePercentile = source.totalAthletes > 0
        ? Math.round((slowerCount / source.totalAthletes) * 100)
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

export function computeRaceHistogram(
  allSeconds: number[],
  binSize: number
): RaceHistogramData {
  const valid = allSeconds.filter((s) => s > 0);
  if (valid.length === 0) {
    return { bins: [], medianSeconds: 0, totalAthletes: 0 };
  }

  const min = Math.floor(Math.min(...valid) / binSize) * binSize;
  const max = Math.ceil(Math.max(...valid) / binSize) * binSize;

  const bins: HistogramBin[] = [];
  for (let start = min; start < max; start += binSize) {
    const end = start + binSize;
    const count = valid.filter((s) => s >= start && s < end).length;
    bins.push({
      label: formatSecondsShort(start),
      rangeStart: start,
      rangeEnd: end,
      count,
      isAthlete: false,
    });
  }

  const medianSeconds = computeMedian(valid);
  return { bins, medianSeconds, totalAthletes: valid.length };
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
