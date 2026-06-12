// Canonical athlete profile slug (e.g. "smith-anderson--us-m").
//
// Must stay in lockstep with slugifyAthlete in scripts/build-search-index.js
// and scripts/build-athlete-shards.js — those scripts generate the athlete
// index and profile shards that /athlete/[slug] is served from. Parity is
// enforced by app/src/lib/__tests__/athlete-slug.test.ts.
//
// Returns null when any required field is missing so callers can fall back
// to rendering a non-linked name.
export function slugifyAthlete(
  fullName: string,
  countryISO: string,
  gender: string,
): string | null {
  if (!fullName || !countryISO || !gender) return null;
  const base = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) return null;
  const country = countryISO.toLowerCase();
  const g = gender.toLowerCase().charAt(0);
  return `${base}--${country}-${g}`;
}
