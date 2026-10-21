// Pure race/course statistics, ported from app/src/lib/data.ts without any
// filesystem access. Runs at build time (scripts/build-data.ts) to produce the
// props for the static race and course pages.

import type {
  AgeGroupBreakdown,
  AthleteResult,
  CourseResult,
  CourseYearSummaryRow,
  DisciplineStats,
  GenderBreakdown,
  LeaderboardEntry,
  RaceSegmentData,
  RaceStats,
} from "./types";
import { BIN_SIZES, computeMedian, computeRaceHistogram, deriveAgeBand, type Discipline } from "./histogram";

/** Parse RFC 4180 CSV text into rows of string arrays. */
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
    } else if (ch === '"') {
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
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Finisher rows of one race CSV. `id` is the 0-based CSV row index. */
export function parseResultsCSV(raw: string): AthleteResult[] {
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
      id: i - 1,
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
  return results;
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

function breakdown<K extends "gender" | "ageGroup">(results: AthleteResult[], key: K) {
  const groups = new Map<string, AthleteResult[]>();
  for (const r of results) {
    const list = groups.get(r[key]) || [];
    list.push(r);
    groups.set(r[key], list);
  }
  return Array.from(groups.entries())
    .map(([value, group]) => {
      const finishes = group.map((r) => r.finishSeconds).filter((s) => s > 0);
      const sorted = [...finishes].sort((a, b) => a - b);
      return {
        [key]: value,
        count: group.length,
        percentage: Math.round((group.length / results.length) * 100),
        medianFinish: computeMedian(finishes),
        fastestFinish: sorted[0] || 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeRaceStats(results: AthleteResult[]): RaceStats {
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
    return {
      discipline: label,
      fastest: sorted[0] || 0,
      slowest: sorted[sorted.length - 1] || 0,
      median: computeMedian(values),
      average: Math.round(avg),
    };
  });

  function buildLeaderboard(gender: string): LeaderboardEntry[] {
    return results
      .filter((r) => r.gender === gender)
      .sort((a, b) => a.genderRank - b.genderRank)
      .slice(0, 10)
      .map((r) => toLeaderboardEntry(r, r.genderRank));
  }

  return {
    totalFinishers: results.length,
    disciplines,
    genderBreakdown: breakdown(results, "gender") as unknown as GenderBreakdown[],
    ageGroupBreakdown: breakdown(results, "ageGroup") as unknown as AgeGroupBreakdown[],
    maleLeaderboard: buildLeaderboard("Male"),
    femaleLeaderboard: buildLeaderboard("Female"),
    histograms: {
      swim: computeRaceHistogram(results.map((r) => r.swimSeconds), BIN_SIZES.swim),
      bike: computeRaceHistogram(results.map((r) => r.bikeSeconds), BIN_SIZES.bike),
      run: computeRaceHistogram(results.map((r) => r.runSeconds), BIN_SIZES.run),
      finish: computeRaceHistogram(results.map((r) => r.finishSeconds), BIN_SIZES.finish),
    },
  };
}

function toLeaderboardEntry(r: AthleteResult, rank: number): LeaderboardEntry {
  return {
    id: r.id,
    rank,
    fullName: r.fullName,
    country: r.country,
    countryISO: r.countryISO,
    ageGroup: r.ageGroup,
    gender: r.gender,
    finishTime: r.finishTime,
    swimTime: r.swimTime,
    bikeTime: r.bikeTime,
    runTime: r.runTime,
  };
}

// Numeric-first ordering: "18-24" < "25-29" < ... < "PRO".
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

const GENDER_ORDER: Record<string, number> = { Male: 0, Female: 1 };

/** Display-ordered gender and age-band label tables for a result set. */
export function segmentLabels(genders: string[], ageGroups: string[]) {
  return {
    genders: Array.from(new Set(genders))
      .filter((g) => g)
      .sort((a, b) => {
        const ra = GENDER_ORDER[a] ?? 2;
        const rb = GENDER_ORDER[b] ?? 2;
        return ra !== rb ? ra - rb : a.localeCompare(b);
      }),
    ageBands: Array.from(new Set(ageGroups.map(deriveAgeBand)))
      .filter((b) => b)
      .sort(compareAgeBands),
  };
}

/** Compact per-finisher arrays that drive the filterable distribution charts. */
export function buildRaceSegmentData(results: AthleteResult[]): RaceSegmentData {
  const { genders, ageBands } = segmentLabels(
    results.map((r) => r.gender),
    results.map((r) => r.ageGroup),
  );
  const genderPos = new Map(genders.map((g, i) => [g, i]));
  const bandPos = new Map(ageBands.map((b, i) => [b, i]));
  return {
    swim: results.map((r) => r.swimSeconds),
    bike: results.map((r) => r.bikeSeconds),
    run: results.map((r) => r.runSeconds),
    finish: results.map((r) => r.finishSeconds),
    genderIdx: results.map((r) => genderPos.get(r.gender) ?? -1),
    ageBandIdx: results.map((r) => bandPos.get(deriveAgeBand(r.ageGroup)) ?? -1),
    genders,
    ageBands,
  };
}

/** Combined top-N by fastest finish across a course's editions (rank recomputed). */
export function buildTopFinishers(results: CourseResult[], gender: string, limit = 10): LeaderboardEntry[] {
  return results
    .filter((r) => r.gender === gender && r.finishSeconds > 0)
    .sort((a, b) => a.finishSeconds - b.finishSeconds)
    .slice(0, limit)
    .map((r, i) => ({ ...toLeaderboardEntry(r, i + 1), raceSlug: r.raceSlug, year: r.year }));
}

/** Per-edition roll-up for the course page's "All editions" table. */
export function getCourseYearSummary(results: CourseResult[]): CourseYearSummaryRow[] {
  const byEdition = new Map<string, CourseResult[]>();
  for (const r of results) {
    const list = byEdition.get(r.raceSlug) || [];
    list.push(r);
    byEdition.set(r.raceSlug, list);
  }
  return Array.from(byEdition.entries())
    .map(([slug, group]) => ({
      slug,
      year: group[0].year,
      finishers: group.length,
      medianFinish: computeMedian(group.map((r) => r.finishSeconds).filter((s) => s > 0)),
    }))
    .sort((a, b) => b.year.localeCompare(a.year));
}
