// Athlete profile shards (/data/athlete/<n>.json.gz) and the race index
// (/data/races.json.gz) they reference. The athlete page loads its shard and
// the race index in parallel and renders in the browser.

import type { AthleteProfile, AthleteRaceEntry } from "./types";

export const ATHLETE_SHARD_COUNT = 4096;

/** djb2 hash of an athlete slug → shard number. Used by the build and the browser. */
export function athleteShardId(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  }
  return h % ATHLETE_SHARD_COUNT;
}

/** [raceSlug, resultId, finishTime, finishSeconds, overallPercentile, ageGroup, swimTime, bikeTime, runTime, swimSeconds, bikeSeconds, runSeconds] */
export type PackedRaceEntry = [string, number, string, number, number, string, string, string, string, number, number, number];
/** [fullName, country, countryISO, entries (newest first)] */
export type PackedProfile = [string, string, string, PackedRaceEntry[]];
export type AthleteShard = Record<string, PackedProfile>;
/** raceSlug → [name, date] */
export type RaceIndex = Record<string, [string, string]>;

export function packRaceEntry(e: AthleteRaceEntry): PackedRaceEntry {
  return [
    e.raceSlug, e.resultId, e.finishTime, e.finishSeconds, e.overallPercentile, e.ageGroup,
    e.swimTime, e.bikeTime, e.runTime, e.swimSeconds, e.bikeSeconds, e.runSeconds,
  ];
}

export function unpackProfile(slug: string, packed: PackedProfile, races: RaceIndex): AthleteProfile {
  const [fullName, country, countryISO, entries] = packed;
  return {
    slug,
    fullName,
    country,
    countryISO,
    races: entries.map(([raceSlug, resultId, finishTime, finishSeconds, overallPercentile, ageGroup, swimTime, bikeTime, runTime, swimSeconds, bikeSeconds, runSeconds]) => {
      const [raceName, raceDate] = races[raceSlug] ?? [raceSlug, ""];
      return {
        raceSlug, raceName, raceDate, resultId, finishTime, finishSeconds, overallPercentile,
        distance: raceSlug.startsWith("im703-") ? "70.3" : "140.6",
        ageGroup, swimTime, bikeTime, runTime, swimSeconds, bikeSeconds, runSeconds,
      };
    }),
  };
}
