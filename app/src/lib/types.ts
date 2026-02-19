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
  ageGroup: string;
  swimTime: string;
  bikeTime: string;
  runTime: string;
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

export interface RaceStats {
  totalFinishers: number;
  disciplines: DisciplineStats[];
  genderBreakdown: GenderBreakdown[];
  ageGroupBreakdown: AgeGroupBreakdown[];
  leaderboard: LeaderboardEntry[];
  histograms: {
    swim: RaceHistogramData;
    bike: RaceHistogramData;
    run: RaceHistogramData;
    finish: RaceHistogramData;
  };
}
