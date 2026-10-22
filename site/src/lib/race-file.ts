// Per-race data file (/data/race/<slug>.json.gz): every finisher of one race in
// a compact column layout. The result page (/race/<slug>/result/<id>) renders
// entirely from this file in the browser, and the race page's filterable
// distributions load it on demand. Written by scripts/build-data.ts.

import type { AthleteResult, HistogramBin, HistogramData, RaceSegmentData } from "./types";
import { BIN_SIZES, computeRaceHistogram, deriveAgeBand, type Discipline } from "./histogram";
import { segmentLabels } from "./stats";

export interface RaceFile {
  slug: string;
  name: string;
  date: string;
  /** Finisher count from the race manifest (used by the share card, as before). */
  finishers: number;
  /** Lookup tables referenced by index from `ag` / `g`. */
  ageGroups: string[];
  genders: string[];
  /** Columns, one entry per finisher in CSV order. */
  id: number[];
  ag: number[];
  g: number[];
  names: string[];
  bib: string[];
  city: string[];
  state: string[];
  country: string[];
  iso: string[];
  /** Display strings exactly as published (they don't always match the seconds). */
  times: Record<Discipline, string[]>;
  secs: Record<Discipline, number[]>;
  rank: { overall: number[]; gender: number[]; ageGroup: number[] };
}

const DISCIPLINES: Discipline[] = ["swim", "bike", "run", "finish", "t1", "t2"];

const TIME_KEY = {
  swim: "swimTime", bike: "bikeTime", run: "runTime", finish: "finishTime", t1: "t1Time", t2: "t2Time",
} as const;
const SECONDS_KEY = {
  swim: "swimSeconds", bike: "bikeSeconds", run: "runSeconds", finish: "finishSeconds", t1: "t1Seconds", t2: "t2Seconds",
} as const;

function indexer() {
  const values: string[] = [];
  const pos = new Map<string, number>();
  return {
    values,
    idx(v: string) {
      let i = pos.get(v);
      if (i === undefined) {
        i = values.length;
        values.push(v);
        pos.set(v, i);
      }
      return i;
    },
  };
}

export function encodeRaceFile(
  race: { slug: string; name: string; date: string; finishers: number },
  results: AthleteResult[],
): RaceFile {
  const ags = indexer();
  const gs = indexer();
  const col = <T>(f: (r: AthleteResult) => T) => results.map(f);
  return {
    slug: race.slug,
    name: race.name,
    date: race.date,
    finishers: race.finishers,
    id: col((r) => r.id),
    ag: col((r) => ags.idx(r.ageGroup)),
    g: col((r) => gs.idx(r.gender)),
    ageGroups: ags.values,
    genders: gs.values,
    names: col((r) => r.fullName),
    bib: col((r) => r.bib),
    city: col((r) => r.city),
    state: col((r) => r.state),
    country: col((r) => r.country),
    iso: col((r) => r.countryISO),
    times: Object.fromEntries(DISCIPLINES.map((d) => [d, col((r) => r[TIME_KEY[d]])])) as RaceFile["times"],
    secs: Object.fromEntries(DISCIPLINES.map((d) => [d, col((r) => r[SECONDS_KEY[d]])])) as RaceFile["secs"],
    rank: {
      overall: col((r) => r.overallRank),
      gender: col((r) => r.genderRank),
      ageGroup: col((r) => r.ageGroupRank),
    },
  };
}

/** Rebuild one finisher's full result row, or undefined when `id` isn't a finisher. */
export function getResult(file: RaceFile, id: number): AthleteResult | undefined {
  const i = file.id.indexOf(id);
  if (i < 0) return undefined;
  const [first, ...rest] = file.names[i].split(" ");
  const result = {
    id,
    firstName: first,
    lastName: rest.join(" "),
    fullName: file.names[i],
    bib: file.bib[i],
    ageGroup: file.ageGroups[file.ag[i]],
    gender: file.genders[file.g[i]],
    city: file.city[i],
    state: file.state[i],
    country: file.country[i],
    countryISO: file.iso[i],
    overallRank: file.rank.overall[i],
    genderRank: file.rank.gender[i],
    ageGroupRank: file.rank.ageGroup[i],
    status: "Finisher",
  } as AthleteResult;
  for (const d of DISCIPLINES) {
    (result as unknown as Record<string, string | number>)[TIME_KEY[d]] = file.times[d][i];
    (result as unknown as Record<string, string | number>)[SECONDS_KEY[d]] = file.secs[d][i];
  }
  return result;
}

export function countWhere(column: number[], value: number): number {
  let n = 0;
  for (const v of column) if (v === value) n++;
  return n;
}

/**
 * One discipline's histogram for a result page, matching the production
 * site's precomputed-histogram path: bins over the scope's finishers, and a
 * percentile equal to the share of finishers in bins starting strictly after
 * the athlete's time.
 */
export function disciplineHistogram(
  file: RaceFile,
  athlete: AthleteResult,
  discipline: Discipline,
  scope: "overall" | "ageGroup",
): HistogramData {
  const athleteSeconds = athlete[SECONDS_KEY[discipline]];
  const all = file.secs[discipline];
  let pool = all;
  if (scope === "ageGroup") {
    const agIdx = file.ageGroups.indexOf(athlete.ageGroup);
    pool = all.filter((_, i) => file.ag[i] === agIdx);
  }
  const source = computeRaceHistogram(pool, BIN_SIZES[discipline]);
  if (source.bins.length === 0) {
    return { bins: [], athleteSeconds, athletePercentile: 0, medianSeconds: source.medianSeconds };
  }
  let slower = 0;
  const bins: HistogramBin[] = source.bins.map((b) => {
    if (b.rangeStart > athleteSeconds) slower += b.count;
    return { ...b, isAthlete: athleteSeconds >= b.rangeStart && athleteSeconds < b.rangeEnd };
  });
  return {
    bins,
    athleteSeconds,
    athletePercentile: source.totalAthletes > 0 ? (slower / source.totalAthletes) * 100 : 0,
    medianSeconds: source.medianSeconds,
  };
}

/** Segment arrays for the race page's filterable distributions. */
export function raceFileSegments(file: RaceFile): RaceSegmentData {
  const { genders, ageBands } = segmentLabels(file.genders, file.ageGroups);
  const genderPos = file.genders.map((g) => genders.indexOf(g));
  const bandPos = file.ageGroups.map((ag) => ageBands.indexOf(deriveAgeBand(ag)));
  return {
    swim: file.secs.swim,
    bike: file.secs.bike,
    run: file.secs.run,
    finish: file.secs.finish,
    genderIdx: file.g.map((i) => genderPos[i]),
    ageBandIdx: file.ag.map((i) => bandPos[i]),
    genders,
    ageBands,
  };
}
