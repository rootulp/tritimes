export interface AthleteResult {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  bib: string;
  ageGroup: string;
  gender: string;
  city: string;
  state: string;
  country: string;
  countryISO: string;
  swimTime: string;
  bikeTime: string;
  runTime: string;
  t1Time: string;
  t2Time: string;
  finishTime: string;
  swimSeconds: number;
  bikeSeconds: number;
  runSeconds: number;
  t1Seconds: number;
  t2Seconds: number;
  finishSeconds: number;
  overallRank: number;
  genderRank: number;
  ageGroupRank: number;
  status: string;
}

export interface HistogramBin {
  label: string;
  rangeStart: number;
  rangeEnd: number;
  count: number;
  isAthlete: boolean;
}

export interface HistogramData {
  bins: HistogramBin[];
  athleteSeconds: number;
  athletePercentile: number;
  medianSeconds: number;
}

export interface SearchEntry {
  id: number;
  fullName: string;
  ageGroup: string;
  country: string;
}

export interface AthleteRaceEntry {
  raceSlug: string;
  raceName: string;
  raceDate: string;
  resultId: number;
  finishTime: string;
  finishSeconds: number;
  overallPercentile: number;
  distance: "70.3" | "140.6";
  ageGroup: string;
  swimTime: string;
  bikeTime: string;
  runTime: string;
  swimSeconds: number;
  bikeSeconds: number;
  runSeconds: number;
}

export interface AthleteSearchEntry {
  slug: string;
  fullName: string;
  country: string;
  countryISO: string;
  raceCount: number;
}

export interface AthleteProfile {
  slug: string;
  fullName: string;
  country: string;
  countryISO: string;
  races: AthleteRaceEntry[];
}

export interface RaceInfo {
  slug: string;
  name: string;
  date: string;
  location: string;
  finishers: number;
}

export interface DisciplineStats {
  discipline: string;
  fastest: number;
  slowest: number;
  median: number;
  average: number;
}

export interface GenderBreakdown {
  gender: string;
  count: number;
  percentage: number;
  medianFinish: number;
  fastestFinish: number;
}

export interface AgeGroupBreakdown {
  ageGroup: string;
  count: number;
  percentage: number;
  medianFinish: number;
  fastestFinish: number;
}

export interface LeaderboardEntry {
  id: number;
  rank: number;
  fullName: string;
  country: string;
  countryISO: string;
  ageGroup: string;
  gender: string;
  finishTime: string;
  swimTime: string;
  bikeTime: string;
  runTime: string;
}

export interface RaceHistogramData {
  bins: HistogramBin[];
  medianSeconds: number;
  totalAthletes: number;
}

export interface RaceSegmentData {
  // Parallel per-finisher arrays (same length, same order).
  swim: number[];
  bike: number[];
  run: number[];
  finish: number[];
  genderIdx: number[]; // index into `genders`
  ageBandIdx: number[]; // index into `ageBands`
  // Label tables, display-ordered.
  genders: string[]; // e.g. ["Male", "Female"]
  ageBands: string[]; // e.g. ["18-24", ..., "PRO"]
}

export interface RaceStats {
  totalFinishers: number;
  disciplines: DisciplineStats[];
  genderBreakdown: GenderBreakdown[];
  ageGroupBreakdown: AgeGroupBreakdown[];
  maleLeaderboard: LeaderboardEntry[];
  femaleLeaderboard: LeaderboardEntry[];
  histograms: {
    swim: RaceHistogramData;
    bike: RaceHistogramData;
    run: RaceHistogramData;
    finish: RaceHistogramData;
  };
}

export interface AggregateStats {
  uniqueCountries: number;
  mostCommonCountry: { countryISO: string; count: number } | null;
  averageHalfFinishSeconds: number;
  averageFullFinishSeconds: number;
  mostCommonAgeGroup: { ageGroup: string; count: number } | null;
  maleCount: number;
  femaleCount: number;
}

export interface CourseStats {
  course: string;
  displayName: string;
  distance: "70.3" | "140.6";
  editions: number;
  totalFinishers: number;
  medianSwimSeconds: number;
  medianBikeSeconds: number;
  medianRunSeconds: number;
  medianFinishSeconds: number;
}

// Per-distance aggregates precomputed by scripts/build-search-index.js into
// data/distance-stats.json.gz; consumed by /stats/average-*-time pages.
export interface DistanceAgeGroupCell {
  count: number;
  medianSeconds: number;
}

export interface DistanceAgeGroupRow {
  bracket: string; // "18-24", ..., "PRO"
  male?: DistanceAgeGroupCell;
  female?: DistanceAgeGroupCell;
}

export interface DistanceStats {
  raceCount: number;
  courseCount: number;
  firstYear: number | null;
  lastYear: number | null;
  finisherCount: number;
  finish: {
    averageSeconds: number;
    medianSeconds: number;
    p10Seconds: number;
    p25Seconds: number;
    p75Seconds: number;
    p90Seconds: number;
  };
  medianSwimSeconds: number;
  medianBikeSeconds: number;
  medianRunSeconds: number;
  byGender: { gender: string; count: number; medianSeconds: number; averageSeconds: number }[];
  byAgeGroup: DistanceAgeGroupRow[];
  byYear: { year: number; count: number; medianSeconds: number }[];
  histogram: RaceHistogramData;
}
