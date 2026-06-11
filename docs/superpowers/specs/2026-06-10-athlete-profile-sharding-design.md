# Athlete Profile Sharding — Design

**Date:** 2026-06-10
**Status:** Approved
**Related:** [journey performance test](./2026-06-10-journey-performance-test-design.md)

## Problem

The `/athlete/[slug]` page is on-demand ISR (`generateStaticParams: []`,
`revalidate: false`). The first request to any uncached slug after a cold boot
runs a Node serverless render that:

1. Reads, gunzips, and `JSON.parse`s the entire **80MB** `athlete-profiles.json.gz`
   (820,008 athletes) — via `getProfilesMapping()` — just to look up one
   athlete's race refs.
2. Parses **each of that athlete's full race CSVs** (`getAllResults`) to compute
   the overall percentile.

Warm, this is ~150ms; cold, it is 6–19s. The ISR cache resets every deploy, and
deploys are frequent (new race results), so most real visits hit a cold path.
The journey gate (home → search → athlete page) measured ~21s on a cold path
against production.

The dominant, fixable cost is the eager full-dataset load. Approach A (chosen):
shard the data so a request loads only what it needs, keeping Node SSR.

## Goal

Cut the cold athlete-page render so the home → search → athlete journey passes
the 2.5s gate, without changing the page's SSR/SEO behavior.

## Non-Goals

- The search-leg client-index download (~1.6s) — separate follow-up. Fixing the
  athlete page alone is projected to bring the journey under 2.5s.
- The `/race/[slug]/result/[id]` page (same ISR pattern, lighter load).
- Edge runtime / full SSG — held in reserve if Node cold-boot floor still
  exceeds budget after this change (escalation reuses the sharded data step).

## Design

> **As-built note:** the section below is the *original* plan. During
> implementation, shards moved from `data/athlete-shards/` (read via `fs`) to
> `app/public/athlete-shards/` served as static CDN assets and **fetched over
> HTTP** at render time, because bundling all shards into the function exceeded
> Vercel's 250MB limit. See [Post-implementation update](#post-implementation-update-2026-06-11)
> for the as-built design; the code in `app/src/lib/data.ts` is the source of truth.

### New data artifact: sharded, self-contained profiles

`data/athlete-shards/<shardId>.json.gz` — **1,024 files**, **built at build
time, gitignored** (mirrors `data/histograms/`).

Each shard is a JSON object `{ [slug]: AthleteProfile }` for the athletes whose
slug hashes to that shard. Each `AthleteProfile` is **fully self-contained**:

```
{ slug, fullName, country, countryISO, races: AthleteRaceEntry[] }
```

with `overallPercentile` and every field the page renders **precomputed** — so a
request needs no CSV parsing and no manifest join. `raceName` and `raceDate` are
embedded in each `AthleteRaceEntry` (denormalized; gzip absorbs the repetition).

### Shard hash

A small deterministic djb2 over the slug string, mod `SHARD_COUNT = 1024`.
Implemented identically in the build script (`scripts/build-athlete-shards.js`,
plain JS) and `app/src/lib/data.ts` (TS). A unit test pins known
`slug → shardId` values so the two implementations cannot silently diverge.

```
function shardId(slug) {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  return h % 1024;
}
```

### New build step: `scripts/build-athlete-shards.js`

Added to the `build` chain after `build-histograms.js`. Single pass over the
committed `data/*.csv`:

1. Per race, parse finishers; compute each finisher's `overallPercentile`
   (`round(countSlower / validFinishers * 100)`) from that race's finish-time
   distribution.
2. Accumulate per-athlete records keyed by the existing `slugifyAthlete(...)`,
   appending a fully-populated `AthleteRaceEntry` per race.
3. Sort each athlete's races by date descending (matches current behavior).
4. Bucket records by `shardId(slug)`; write each bucket as a gzipped JSON file.

Reuses the CSV parser, `slugifyAthlete`, and percentile logic already present in
`build-search-index.js` / `data.ts`.

### Runtime change: `getAthleteProfile(slug)`

```
shardId = hash(slug) % 1024
shard = cache.get(shardId) ?? readAndParse(data/athlete-shards/{shardId}.json.gz)
return shard[slug] ?? null
```

Deletes the 80MB `getProfilesMapping()` load and the per-race `getAllResults()`
parsing from the athlete-page path. Shards are cached in an in-memory `Map`
keyed by shardId.

### Cleanup

- Remove `getProfilesMapping()` and the `ProfilesMapping` type from `data.ts`.
- Remove `athlete-profiles.json.gz` generation from `build-search-index.js` and
  delete the committed 16MB file.
- `athlete-index.tsv.gz` (search) is untouched.

## Data flow

`/athlete/[slug]` → `getAthleteProfile(slug)` → `hash(slug) % 1024` →
read one small shard (cached) → return profile. Cold render goes from
"80MB parse + N CSV parses" to "one small-shard read."

## Testing (red/green TDD)

1. **Unit:** `shardId(slug)` is deterministic, in `[0, 1024)`, matches pinned
   values (build/runtime parity guard).
2. **Integration:** `getAthleteProfile` returns a profile matching the
   pre-change output for a known athlete, and `null` for an unknown slug. Run
   against shards generated by the new build step.
3. **End-to-end gate:** `e2e/journey-performance.spec.ts` against a preview
   deploy must drop under 2,500ms (currently ~21s — red).

## Risks

- **Next.js file tracing:** the dynamically-pathed shard reads must be bundled
  into the serverless function. Existing dynamic CSV reads already work in prod
  (precedent holds); verify shards are included, add `outputFileTracingIncludes`
  if not.
- **Build memory:** all self-contained records held before sharding
  (~hundreds of MB). If the build OOMs, raise `--max-old-space-size` or write
  shards incrementally. Measure during implementation.

## Acceptance

- Build produces the athlete shards; `athlete-profiles.json.gz` and
  `getProfilesMapping` are gone.
- Unit + integration tests pass; `npm run build` succeeds.
- The athlete-page leg of the journey is materially faster on a cold path.

## Post-implementation update (2026-06-11)

Two things changed during implementation:

1. **Shards are served as static assets, not bundled into the function.**
   `outputFileTracingIncludes` bundled all 1,024 shards (~144MB) into the
   `/athlete/[slug]` function, pushing it to ~350MB — over Vercel's 250MB
   serverless size limit, so the deploy failed. Fix: write shards to
   `app/public/athlete-shards/` (static CDN assets) and have `getAthleteProfile`
   **fetch** the one needed shard over HTTP (`force-cache`, with the
   `VERCEL_AUTOMATION_BYPASS_SECRET` header so protected previews work). The
   function bundle dropped back to ~205MB.

2. **Validated result and revised scope.** Cold-path journey gate against a
   fresh preview: athlete-page leg **~19s → ~3.8s** (this fix works). But the
   full journey is still ~12.4s, now dominated by:
   - **Cold `/api/search` (~8.1s)** — same root cause (a function eagerly
     loading the 9.7MB / 820K-row index on cold boot); the client falls back to
     it before the in-browser index parse is ready.
   - **Residual athlete-page Node cold-boot floor (~3.8s)** — would need the
     Edge runtime (Approach C) to go lower.

   The earlier projection that fixing the athlete page alone would land the
   journey under 2.5s was based on *warm* search numbers and was wrong for the
   cold path. These two items are tracked as follow-ups; the journey gate
   (`journey-performance.spec.ts`) stays red until they land.
