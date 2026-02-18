import fs from "fs";
import path from "path";
import { AthleteResult, AthleteProfile, AthleteRaceEntry, AthleteSearchEntry, HistogramBin, HistogramData, RaceInfo, SearchEntry } from "./types";

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

function parseCSV(raceSlug: string): AthleteResult[] {
  const cached = cache.get(raceSlug);
  if (cached) return cached;

  const csvFile = `${raceSlug}.csv`;
  const csvPath = path.join(process.cwd(), "..", "data", csvFile);
  if (!fs.existsSync(csvPath)) return [];

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  const results: AthleteResult[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
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

export function getSearchIndex(raceSlug: string): SearchEntry[] {
  return getAllResults(raceSlug).map((r) => ({
    id: r.id,
    fullName: r.fullName,
    ageGroup: r.ageGroup,
    country: r.country,
  }));
}

function slugifyAthlete(fullName: string, countryISO: string, gender: string): string {
  const base = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const country = countryISO.toLowerCase();
  const g = gender.toLowerCase().charAt(0);
  return `${base}--${country}-${g}`;
}

let athleteIndexCache: AthleteSearchEntry[] | null = null;

export function getDeduplicatedAthleteIndex(): AthleteSearchEntry[] {
  if (athleteIndexCache) return athleteIndexCache;

  const indexPath = path.join(process.cwd(), "..", "data", "athlete-index.json");
  const raw = fs.readFileSync(indexPath, "utf-8");
  const data = JSON.parse(raw) as {
    countries: Record<string, string>;
    athletes: [string, string, string, number][]; // [fullName, countryISO, gender, raceCount]
  };

  athleteIndexCache = data.athletes.map(([fullName, countryISO, gender, raceCount]) => ({
    slug: slugifyAthlete(fullName, countryISO, gender),
    fullName,
    country: data.countries[countryISO] || countryISO,
    countryISO,
    raceCount,
  }));
  return athleteIndexCache;
}

export function getAthleteProfile(slug: string): AthleteProfile | null {
  const races: AthleteRaceEntry[] = [];
  let fullName = "";
  let country = "";
  let countryISO = "";

  for (const race of getRacesInternal()) {
    for (const r of getAllResults(race.slug)) {
      if (slugifyAthlete(r.fullName, r.countryISO, r.gender) === slug) {
        fullName = r.fullName;
        country = r.country;
        countryISO = r.countryISO;
        races.push({
          raceSlug: race.slug,
          raceName: race.name,
          raceDate: race.date,
          resultId: r.id,
          finishTime: r.finishTime,
          ageGroup: r.ageGroup,
        });
      }
    }
  }

  if (races.length === 0) return null;

  races.sort((a, b) => b.raceDate.localeCompare(a.raceDate));

  return { slug, fullName, country, countryISO, races };
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

function formatSecondsShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}m`;
}

export function computeHistogram(
  allSeconds: number[],
  athleteSeconds: number,
  binSize: number
): HistogramData {
  const valid = allSeconds.filter((s) => s > 0);
  if (valid.length === 0) {
    return { bins: [], athleteSeconds, athletePercentile: 0 };
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

  return { bins, athleteSeconds, athletePercentile };
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

export function getDisciplineHistogram(
  raceSlug: string,
  athlete: AthleteResult,
  discipline: Discipline,
  scope: "overall" | "ageGroup"
): HistogramData {
  let pool = getAllResults(raceSlug);
  if (scope === "ageGroup") {
    pool = pool.filter((r) => r.ageGroup === athlete.ageGroup);
  }

  const allSeconds = pool.map((r) => getSeconds(r, discipline));
  const athleteSeconds = getSeconds(athlete, discipline);

  return computeHistogram(allSeconds, athleteSeconds, BIN_SIZES[discipline]);
}
