/**
 * Display-time fallback for race locations.
 *
 * `data/races.json` only has `location` populated for roughly half of the
 * races, so race cards and headers would otherwise render without a location
 * line. When the manifest location is missing we conservatively derive one
 * from the race name, which follows the pattern
 * "<year> IRONMAN [70.3] <place>" (e.g. "2026 IRONMAN 70.3 Subic Bay
 * Philippines" -> "Subic Bay Philippines").
 */

const RACE_NAME_PATTERN = /^\d{4}\s+IRONMAN(?:\s+70\.3)?\s+(.+)$/;

/**
 * Derives a location string from a race name by stripping the leading year
 * and the "IRONMAN" / "IRONMAN 70.3" prefix.
 *
 * Returns null when the name does not match the expected pattern (e.g.
 * "2018 5150 Mont-Tremblant") or when the remainder is a championship
 * designation rather than a place (e.g. "2024 IRONMAN World Championship"),
 * so callers can render nothing instead of garbage.
 */
export function deriveLocationFromRaceName(name: string): string | null {
  const match = name.trim().match(RACE_NAME_PATTERN);
  if (!match) return null;

  const remainder = match[1].trim();
  // "<year> IRONMAN 70.3" with no place: the optional 70.3 group backtracks
  // and "70.3" is captured as the remainder.
  if (!remainder || remainder === "70.3") return null;

  // Championship remainders ("World Championship - Men", "European
  // Championship Elsinore", ...) describe the race, not its location.
  if (/\bchampionship\b/i.test(remainder)) return null;

  return remainder;
}

/**
 * Returns the location to display for a race: the manifest `location` when
 * present, otherwise a fallback derived from the race name, otherwise null.
 */
export function getRaceLocation(race: { name: string; location: string }): string | null {
  const manifestLocation = race.location?.trim();
  if (manifestLocation) return manifestLocation;
  return deriveLocationFromRaceName(race.name);
}
