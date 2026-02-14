import fs from "fs";
import path from "path";
import { AthleteResult, HistogramBin, HistogramData, SearchEntry } from "./types";

let cachedResults: AthleteResult[] | null = null;

function parseCSV(): AthleteResult[] {
  if (cachedResults) return cachedResults;

  const csvPath = path.join(process.cwd(), "..", "data", "im703-new-york-2025.csv");
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

  cachedResults = results;
  return results;
}

export function getAllResults(): AthleteResult[] {
  return parseCSV();
}

export function getAthleteById(id: number): AthleteResult | undefined {
  return getAllResults().find((r) => r.id === id);
}

export function getAllIds(): number[] {
  return getAllResults().map((r) => r.id);
}

export function getSearchIndex(): SearchEntry[] {
  return getAllResults().map((r) => ({
    id: r.id,
    fullName: r.fullName,
    ageGroup: r.ageGroup,
    country: r.country,
  }));
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

  // Percentile: what percentage of finishers the athlete beat
  const fasterCount = valid.filter((s) => s > athleteSeconds).length;
  const athletePercentile = Math.round((fasterCount / valid.length) * 100);

  return { bins, athleteSeconds, athletePercentile };
}

export type Discipline = "swim" | "bike" | "run" | "finish";

const BIN_SIZES: Record<Discipline, number> = {
  swim: 300,    // 5-minute bins
  bike: 600,    // 10-minute bins
  run: 600,     // 10-minute bins
  finish: 600,  // 10-minute bins
};

function getSeconds(r: AthleteResult, discipline: Discipline): number {
  switch (discipline) {
    case "swim": return r.swimSeconds;
    case "bike": return r.bikeSeconds;
    case "run": return r.runSeconds;
    case "finish": return r.finishSeconds;
  }
}

export function getDisciplineHistogram(
  athlete: AthleteResult,
  discipline: Discipline,
  scope: "overall" | "ageGroup"
): HistogramData {
  let pool = getAllResults();
  if (scope === "ageGroup") {
    pool = pool.filter((r) => r.ageGroup === athlete.ageGroup);
  }

  const allSeconds = pool.map((r) => getSeconds(r, discipline));
  const athleteSeconds = getSeconds(athlete, discipline);

  return computeHistogram(allSeconds, athleteSeconds, BIN_SIZES[discipline]);
}
