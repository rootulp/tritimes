// Shapes of the per-page JSON that scripts/build-data.ts writes to
// .cache/pages/ and the Astro pages read at build time.

import type { CourseInfo, CourseYearSummaryRow, RaceInfo, RaceStats } from "./types";

export interface DistributionLabels {
  genders: string[];
  ageBands: string[];
}

export interface RacePageData extends DistributionLabels {
  race: RaceInfo;
  stats: RaceStats;
}

export interface CoursePageData extends DistributionLabels {
  info: CourseInfo;
  stats: RaceStats;
  yearSummary: CourseYearSummaryRow[];
}

export interface StatsPageData {
  raceCount: number;
  totalResults: number;
  uniqueAthletes: number;
  ironmanCourseCount: number;
  halfIronmanCourseCount: number;
  earliestRace: { slug: string; name: string; date: string };
  mostRecentRace: { slug: string; name: string; date: string };
  largestRace: { slug: string; name: string; finishers: number };
  smallestRace: { slug: string; name: string; finishers: number };
  avgParticipants: number;
  locationMost703: { location: string; count: number };
  locationMostIM: { location: string; count: number };
  yearWithMostRaces: { year: string; count: number };
  ironmanRaceCount: number;
  halfIronmanRaceCount: number;
  repeatAthletes: number;
  athleteWithMostRaces: { slug: string; fullName: string; raceCount: number };
}
