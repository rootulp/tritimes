import type { RaceInfo } from "@/lib/types";

export interface RaceFilters {
  /** "All" | "70.3" | "140.6" */
  distance: string;
  /** "All" or a 4-digit year */
  year: string;
  /** Free-text query matched against race name and location */
  query: string;
}

/** Lowercase and strip diacritics (NFD + combining-mark removal). */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Case- and diacritic-insensitive substring match of `query` against the
 * race's name and location. An empty/whitespace query matches everything.
 */
export function matchesRaceQuery(
  race: Pick<RaceInfo, "name" | "location">,
  query: string,
): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  return normalizeText(race.name).includes(q) || normalizeText(race.location).includes(q);
}

/** Applies distance, year, and text filters; used by the /races page. */
export function filterRaces(races: RaceInfo[], filters: RaceFilters): RaceInfo[] {
  return races.filter((race) => {
    if (filters.distance === "70.3" && !race.slug.startsWith("im703-")) return false;
    if (filters.distance === "140.6" && race.slug.startsWith("im703-")) return false;
    if (filters.year !== "All" && race.date.slice(0, 4) !== filters.year) return false;
    return matchesRaceQuery(race, filters.query);
  });
}
