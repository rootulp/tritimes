// Pure (de)serialization between the /races filter state and the URL query
// string. Keeping this logic out of React makes the RaceList URL-sync wiring
// thin and lets us unit-test the tricky parts. Mirrors the pure-helper pattern
// of race-filter.ts.

export interface RaceUrlFilters {
  /** "All" | "70.3" | "140.6" */
  distance: string;
  /** "All" or a 4-digit year */
  year: string;
  /** Free-text query matched against race name and location */
  query: string;
}

const VALID_DISTANCES = ["70.3", "140.6"];

/**
 * Serialize filters to a query string (no leading "?"), omitting any filter
 * that sits at its default ("All" distance/year, empty or whitespace-only
 * query). The query is stored verbatim (not trimmed) so it can back a
 * controlled text input without eating mid-word spaces. Params are emitted in
 * distance, year, q order.
 */
export function filtersToQueryString(filters: RaceUrlFilters): string {
  const params = new URLSearchParams();
  if (filters.distance !== "All") params.set("distance", filters.distance);
  if (filters.year !== "All") params.set("year", filters.year);
  if (filters.query.trim()) params.set("q", filters.query);
  return params.toString();
}

/**
 * Read filters from URL search params, falling back to defaults for missing or
 * invalid values. Accepts a URLSearchParams (or the ReadonlyURLSearchParams
 * returned by Next's useSearchParams).
 */
export function parseFiltersFromParams(params: URLSearchParams): RaceUrlFilters {
  const rawDistance = params.get("distance");
  const distance = rawDistance && VALID_DISTANCES.includes(rawDistance) ? rawDistance : "All";
  const year = params.get("year") ?? "All";
  const query = params.get("q") ?? "";
  return { distance, year, query };
}

/**
 * Build a /races link pre-filtered to a course: the course's distance plus its
 * display name as the free-text query. Reuses filtersToQueryString so course
 * links stay consistent with the Races URL format.
 */
export function courseHref(distance: string, displayName: string): string {
  return `/races?${filtersToQueryString({ distance, year: "All", query: displayName })}`;
}
