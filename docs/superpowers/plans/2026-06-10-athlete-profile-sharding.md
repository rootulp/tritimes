# Athlete Profile Sharding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 80MB monolithic athlete-profiles load on the `/athlete/[slug]` cold path with build-time, sharded, self-contained per-athlete profiles so the home → search → athlete journey passes the 2.5s gate.

**Architecture:** A new build step writes `data/athlete-shards/<id>.json.gz` (1,024 gitignored files, mirroring `data/histograms/`), each a `{ slug: AthleteProfile }` map with `overallPercentile` and all fields precomputed. `getAthleteProfile(slug)` hashes the slug to a shard, reads only that shard (cached), and returns the record — no 80MB parse, no per-request CSV parsing.

**Tech Stack:** Next.js 16 (Node serverless), TypeScript, Node build scripts (zero deps), Vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-06-10-athlete-profile-sharding-design.md`

---

## File Structure

- `app/src/lib/data.ts` — add `SHARD_COUNT`, `shardId()`, shard loader; rewrite `getAthleteProfile()`; remove `getProfilesMapping()` + `ProfilesMapping`.
- `scripts/build-athlete-shards.js` — **new** build step; exports `shardId`, `SHARD_COUNT`, `parseCSV`, `slugifyAthlete`, `buildAthleteRecords` for tests; writes shards when run as main.
- `app/src/lib/__tests__/athlete-shards.test.ts` — **new** unit tests for `shardId` parity and `buildAthleteRecords`.
- `app/package.json` — add `build-athlete-shards.js` to the `build` chain.
- `app/next.config.ts` — add `outputFileTracingIncludes` for the shard files.
- `.gitignore` — ignore `data/athlete-shards/`.
- `scripts/build-search-index.js` — remove `athlete-profiles.json.gz` generation.
- `data/athlete-profiles.json.gz` — delete (replaced by shards).

---

## Task 1: Shard hash function (data.ts) + parity-ready unit test

**Files:**
- Modify: `app/src/lib/data.ts` (add near top, after imports)
- Test: `app/src/lib/__tests__/athlete-shards.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `app/src/lib/__tests__/athlete-shards.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shardId, SHARD_COUNT } from "@/lib/data";

describe("shardId", () => {
  it("is deterministic and within range", () => {
    const slugs = [
      "smith-anderson--us-m",
      "miller-argent--au-m",
      "garcia-araceli-del-rocio--mx-f",
      "",
    ];
    for (const slug of slugs) {
      const id = shardId(slug);
      expect(id).toBe(shardId(slug));
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(SHARD_COUNT);
      expect(Number.isInteger(id)).toBe(true);
    }
  });

  it("matches pinned values (build/runtime parity anchor)", () => {
    expect(SHARD_COUNT).toBe(1024);
    // Pin a few values so the JS build script and TS runtime stay in sync.
    expect(shardId("smith-anderson--us-m")).toBe(
      djb2Ref("smith-anderson--us-m"),
    );
    expect(shardId("miller-argent--au-m")).toBe(djb2Ref("miller-argent--au-m"));
  });
});

// Reference implementation duplicated in the test to lock the algorithm.
function djb2Ref(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  }
  return h % 1024;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/__tests__/athlete-shards.test.ts`
Expected: FAIL — `shardId`/`SHARD_COUNT` are not exported from `@/lib/data`.

- [ ] **Step 3: Add the implementation to `app/src/lib/data.ts`**

Insert after the imports (around line 4):

```ts
export const SHARD_COUNT = 1024;

/**
 * Deterministic djb2 hash of an athlete slug → shard bucket.
 * MUST stay identical to scripts/build-athlete-shards.js (same algorithm,
 * same SHARD_COUNT) — see athlete-shards.test.ts for the parity anchor.
 */
export function shardId(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  }
  return h % SHARD_COUNT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/__tests__/athlete-shards.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/data.ts app/src/lib/__tests__/athlete-shards.test.ts
git commit -m "feat: add deterministic athlete shard hash"
```

---

## Task 2: Build script core — `buildAthleteRecords` (TDD with fixture)

**Files:**
- Create: `scripts/build-athlete-shards.js`
- Test: `app/src/lib/__tests__/athlete-shards.test.ts` (extend)

- [ ] **Step 1: Write the failing test (append to athlete-shards.test.ts)**

```ts
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const shards = require("../../../../scripts/build-athlete-shards.js");

describe("build script parity + records", () => {
  it("script shardId matches data.ts shardId", () => {
    for (const slug of ["smith-anderson--us-m", "miller-argent--au-m", "a--gb-f"]) {
      expect(shards.shardId(slug)).toBe(shardId(slug));
    }
  });

  it("buildAthleteRecords aggregates races, precomputes percentile, sorts by date desc", () => {
    const races = [
      { slug: "im703-test-2025", name: "IM 70.3 Test 2025", date: "2025-06-01" },
      { slug: "im-test-2024", name: "IM Test 2024", date: "2024-06-01" },
    ];
    const header =
      "FullName,Country,CountryISO,Gender,Status,AgeGroup,FinishTime,FinishSeconds,SwimTime,SwimSeconds,BikeTime,BikeSeconds,RunTime,RunSeconds";
    const csv = {
      "im703-test-2025": [
        header,
        "Ann Lee,United States,US,Female,Finisher,F30-34,5:00:00,18000,0:30:00,1800,2:30:00,9000,2:00:00,7200",
        "Bob Roe,United States,US,Male,Finisher,M30-34,6:00:00,21600,0:35:00,2100,3:00:00,10800,2:25:00,8700",
        "Cy Doe,United States,US,Male,Finisher,M30-34,7:00:00,25200,0:40:00,2400,3:30:00,12600,2:50:00,10200",
      ].join("\n"),
      "im-test-2024": [
        header,
        "Ann Lee,United States,US,Female,Finisher,F30-34,5:30:00,19800,0:32:00,1920,2:40:00,9600,2:18:00,8280",
      ].join("\n"),
    };
    const records = shards.buildAthleteRecords(races, (slug) => csv[slug] ?? null);
    const annSlug = shards.slugifyAthlete("Ann Lee", "US", "Female");
    const ann = records.get(annSlug);

    expect(ann.fullName).toBe("Ann Lee");
    expect(ann.country).toBe("United States");
    expect(ann.countryISO).toBe("US");
    expect(ann.races.map((r) => r.raceSlug)).toEqual(["im703-test-2025", "im-test-2024"]);
    // 2025 race: Ann (18000s) beat 2 of 3 finishers → 67%.
    expect(ann.races[0].overallPercentile).toBe(67);
    expect(ann.races[0].distance).toBe("70.3");
    expect(ann.races[0].resultId).toBe(0);
    expect(ann.races[0].raceName).toBe("IM 70.3 Test 2025");
    expect(ann.races[0].swimSeconds).toBe(1800);
    // 2024 race: Ann is the only finisher → beat 0 others → 0%.
    expect(ann.races[1].overallPercentile).toBe(0);
    expect(ann.races[1].distance).toBe("140.6");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/__tests__/athlete-shards.test.ts`
Expected: FAIL — `scripts/build-athlete-shards.js` does not exist.

- [ ] **Step 3: Create `scripts/build-athlete-shards.js`**

```js
#!/usr/bin/env node

/**
 * Builds sharded, self-contained athlete profiles for /athlete/[slug]:
 *   data/athlete-shards/<id>.json.gz   — { [slug]: AthleteProfile }
 *
 * Each profile precomputes overallPercentile and every field the page renders,
 * so a request reads ONE small shard (no 80MB profiles parse, no CSV parsing).
 *
 * Run: node scripts/build-athlete-shards.js  (part of the npm build chain)
 * Gitignored output, mirroring data/histograms/.
 */

const fs = require("fs");
const path = require("path");
const { gzipSync } = require("zlib");

const SHARD_COUNT = 1024;
const dataDir = path.join(__dirname, "..", "data");
const manifestPath = path.join(dataDir, "races.json");
const shardsDir = path.join(dataDir, "athlete-shards");

// MUST stay identical to shardId() in app/src/lib/data.ts.
function shardId(slug) {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  }
  return h % SHARD_COUNT;
}

// RFC 4180 parser — same as build-search-index.js / build-histograms.js.
function parseCSVRows(raw) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < raw.length && raw[i + 1] === '"') { field += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ",") { row.push(field); field = ""; i++; }
      else if (ch === "\r" && i + 1 < raw.length && raw[i + 1] === "\n") {
        row.push(field); field = ""; rows.push(row); row = []; i += 2;
      } else if (ch === "\n") {
        row.push(field); field = ""; rows.push(row); row = []; i++;
      } else { field += ch; i++; }
    }
  }
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Returns finisher rows with _id = 0-based CSV row index (matches data.ts).
function parseCSV(raw) {
  const rows = parseCSVRows(raw);
  if (rows.length === 0) return [];
  const headers = rows[0];
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const r = {};
    headers.forEach((h, idx) => { r[h] = values[idx] || ""; });
    if (r.Status !== "Finisher") continue;
    r._id = i - 1;
    results.push(r);
  }
  return results;
}

function slugifyAthlete(fullName, countryISO, gender) {
  const base = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}--${countryISO.toLowerCase()}-${gender.toLowerCase().charAt(0)}`;
}

// Count of finishers strictly slower than x, via sorted-ascending array.
function countGreater(sortedAsc, x) {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return sortedAsc.length - lo;
}

/**
 * @param races  [{slug, name, date}, ...]
 * @param readCsv (raceSlug) => string | null  (raw CSV text)
 * @returns Map<slug, AthleteProfile>
 */
function buildAthleteRecords(races, readCsv) {
  const bySlug = new Map();

  for (const race of races) {
    const raw = readCsv(race.slug);
    if (raw == null) continue;
    const results = parseCSV(raw);
    const distance = race.slug.startsWith("im703-") ? "70.3" : "140.6";

    const validFinish = results
      .map((r) => Number(r.FinishSeconds) || 0)
      .filter((s) => s > 0);
    const sortedAsc = validFinish.slice().sort((a, b) => a - b);
    const total = validFinish.length;

    for (const r of results) {
      const finishSeconds = Number(r.FinishSeconds) || 0;
      const overallPercentile =
        total > 0 ? Math.round((countGreater(sortedAsc, finishSeconds) / total) * 100) : 0;

      const slug = slugifyAthlete(r.FullName, r.CountryISO, r.Gender);
      let profile = bySlug.get(slug);
      if (!profile) {
        profile = { slug, fullName: r.FullName, country: r.Country, countryISO: r.CountryISO, races: [] };
        bySlug.set(slug, profile);
      }
      // Last seen wins, matching getAthleteProfile's prior behavior.
      profile.fullName = r.FullName;
      profile.country = r.Country;
      profile.countryISO = r.CountryISO;

      profile.races.push({
        raceSlug: race.slug,
        raceName: race.name,
        raceDate: race.date,
        resultId: r._id,
        finishTime: r.FinishTime,
        finishSeconds,
        overallPercentile,
        distance,
        ageGroup: r.AgeGroup,
        swimTime: r.SwimTime,
        bikeTime: r.BikeTime,
        runTime: r.RunTime,
        swimSeconds: Number(r.SwimSeconds) || 0,
        bikeSeconds: Number(r.BikeSeconds) || 0,
        runSeconds: Number(r.RunSeconds) || 0,
      });
    }
  }

  for (const profile of bySlug.values()) {
    profile.races.sort((a, b) => b.raceDate.localeCompare(a.raceDate));
  }
  return bySlug;
}

function main() {
  const start = Date.now();
  const races = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const records = buildAthleteRecords(races, (slug) => {
    const p = path.join(dataDir, `${slug}.csv`);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
  });

  const shards = Array.from({ length: SHARD_COUNT }, () => ({}));
  for (const [slug, profile] of records) {
    shards[shardId(slug)][slug] = profile;
  }

  fs.rmSync(shardsDir, { recursive: true, force: true });
  fs.mkdirSync(shardsDir, { recursive: true });
  for (let i = 0; i < SHARD_COUNT; i++) {
    fs.writeFileSync(path.join(shardsDir, `${i}.json.gz`), gzipSync(JSON.stringify(shards[i])));
  }

  console.log(
    `Built athlete shards: ${records.size} athletes → ${SHARD_COUNT} files in ${Date.now() - start}ms → ${path.relative(process.cwd(), shardsDir)}`,
  );
}

if (require.main === module) main();

module.exports = { shardId, SHARD_COUNT, parseCSV, parseCSVRows, slugifyAthlete, buildAthleteRecords };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/__tests__/athlete-shards.test.ts`
Expected: PASS (all tests including parity + records).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-athlete-shards.js app/src/lib/__tests__/athlete-shards.test.ts
git commit -m "feat: add athlete shard build script"
```

---

## Task 3: Rewrite `getAthleteProfile` to read shards; remove `getProfilesMapping`

**Files:**
- Modify: `app/src/lib/data.ts:210-274` (the `ProfilesMapping` type, `profilesMappingCache`, `getProfilesMapping`, and `getAthleteProfile`)

- [ ] **Step 1: Replace the profiles-mapping block in `app/src/lib/data.ts`**

Delete this block (currently ~lines 210-274):

```ts
// Compact mapping: slug → [[raceSlug, resultId], ...]
type ProfilesMapping = Record<string, [string, number][]>;

let profilesMappingCache: ProfilesMapping | null = null;

function getProfilesMapping(): ProfilesMapping {
  if (!profilesMappingCache) {
    const profilesPath = path.join(process.cwd(), "..", "data", "athlete-profiles.json.gz");
    profilesMappingCache = JSON.parse(gunzipSync(fs.readFileSync(profilesPath)).toString());
  }
  return profilesMappingCache!;
}

export function getAthleteProfile(slug: string): AthleteProfile | null {
  const mapping = getProfilesMapping();
  const refs = mapping[slug];
  if (!refs || refs.length === 0) return null;
  // ... (entire CSV-parsing body) ...
  return { slug, fullName, country, countryISO, races };
}
```

Replace with:

```ts
// Sharded, self-contained athlete profiles built at build time by
// scripts/build-athlete-shards.js. One shard read per request — no 80MB
// profiles parse, no per-race CSV parsing.
const shardCache = new Map<number, Record<string, AthleteProfile>>();

function loadAthleteShard(id: number): Record<string, AthleteProfile> {
  const cached = shardCache.get(id);
  if (cached) return cached;
  const shardPath = path.join(process.cwd(), "..", "data", "athlete-shards", `${id}.json.gz`);
  if (!fs.existsSync(shardPath)) {
    shardCache.set(id, {});
    return {};
  }
  const shard = JSON.parse(
    gunzipSync(fs.readFileSync(shardPath)).toString(),
  ) as Record<string, AthleteProfile>;
  shardCache.set(id, shard);
  return shard;
}

export function getAthleteProfile(slug: string): AthleteProfile | null {
  const shard = loadAthleteShard(shardId(slug));
  return shard[slug] ?? null;
}
```

- [ ] **Step 2: Verify unused imports/symbols are clean**

Run: `cd app && npx eslint src/lib/data.ts`
Expected: exit 0. (`gunzipSync`, `fs`, `path` are still used elsewhere; `AthleteRaceEntry` is still imported/used by the type. If eslint flags a now-unused import, remove only that symbol.)

- [ ] **Step 3: Build shards so the integration check has data**

Run: `node scripts/build-athlete-shards.js`
Expected: prints `Built athlete shards: <N> athletes → 1024 files ...` and creates `data/athlete-shards/`.

- [ ] **Step 4: Manually verify a known athlete resolves**

Run:
```bash
cd app && node -e '
const { execSync } = require("child_process");
' 2>/dev/null; cd /Users/rootulp/git/tritimes && node -e '
const fs=require("fs"),path=require("path"),{gunzipSync}=require("zlib");
const s=require("./scripts/build-athlete-shards.js");
const slug="smith-anderson--us-m";
const id=s.shardId(slug);
const p=path.join("data","athlete-shards",`${id}.json.gz`);
const shard=JSON.parse(gunzipSync(fs.readFileSync(p)).toString());
const rec=shard[slug];
console.log("found:", !!rec, "races:", rec && rec.races.length, "name:", rec && rec.fullName);
'
```
Expected: `found: true races: 5 name: Smith Anderson` (race count may differ as data grows; must be `found: true`).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "refactor: read athlete profile from shard instead of 80MB mapping"
```

---

## Task 4: Wire build chain, gitignore, file tracing; remove old profiles artifact

**Files:**
- Modify: `app/package.json:8` (build script)
- Modify: `.gitignore`
- Modify: `app/next.config.ts`
- Modify: `scripts/build-search-index.js` (remove profiles generation)
- Delete: `data/athlete-profiles.json.gz`

- [ ] **Step 1: Add the build step to `app/package.json`**

Change the `build` script from:

```json
"build": "node ../scripts/gzip-csvs.js && node ../scripts/build-histograms.js && node ../scripts/copy-search-index.js && next build",
```

to:

```json
"build": "node ../scripts/gzip-csvs.js && node ../scripts/build-histograms.js && node ../scripts/build-athlete-shards.js && node ../scripts/copy-search-index.js && next build",
```

- [ ] **Step 2: Gitignore the shards (append to `.gitignore`)**

```
data/athlete-shards/
```

- [ ] **Step 3: Ensure shards are traced into the serverless bundle**

In `app/next.config.ts`, add inside `nextConfig` (sibling of `headers`):

```ts
  outputFileTracingIncludes: {
    "/athlete/[slug]": ["../data/athlete-shards/**"],
  },
```

- [ ] **Step 4: Remove `athlete-profiles.json.gz` generation from `scripts/build-search-index.js`**

Delete these lines:
- The `profilesMap` declaration: `// profilesMap: slug → [[raceSlug, resultId], ...]` and `const profilesMap = new Map();`
- The profiles-push block inside the finisher loop:
  ```js
      // Profiles index
      const refs = profilesMap.get(slug);
      if (refs) {
        refs.push([race.slug, r._id]);
      } else {
        profilesMap.set(slug, [[race.slug, r._id]]);
      }
  ```
- The `profilesPath` constant and its write:
  ```js
  const profilesPath = path.join(dataDir, "athlete-profiles.json.gz");
  ```
  ```js
  // Write profiles index as { slug: [[raceSlug, resultId], ...] } (gzipped)
  const profiles = Object.fromEntries(profilesMap);
  fs.writeFileSync(profilesPath, gzipSync(JSON.stringify(profiles)));
  ```
- The profiles console.log:
  ```js
  console.log(
    `Built profiles index: ${profilesMap.size} athletes → ${path.relative(process.cwd(), profilesPath)}`
  );
  ```

- [ ] **Step 5: Delete the committed monolithic profiles file**

```bash
git rm data/athlete-profiles.json.gz
```

- [ ] **Step 6: Verify nothing else references the removed symbols**

Run:
```bash
cd /Users/rootulp/git/tritimes && grep -rn "athlete-profiles.json.gz\|getProfilesMapping\|ProfilesMapping" app/src scripts | grep -v node_modules
```
Expected: no output.

- [ ] **Step 7: Run the unit suite + lint**

Run: `cd app && npx vitest run && npx eslint src ../scripts/build-athlete-shards.js`
Expected: all tests pass, eslint exit 0.

- [ ] **Step 8: Commit**

```bash
git add app/package.json .gitignore app/next.config.ts scripts/build-search-index.js
git commit -m "build: generate athlete shards in build chain, drop monolithic profiles"
```

---

## Task 5: Full build + local production verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full production build**

Run: `cd app && npm run build`
Expected: build succeeds; `build-athlete-shards` logs its athlete/shard counts; no errors.

- [ ] **Step 2: If the build OOMs on shard generation**

Symptom: `JavaScript heap out of memory` during `build-athlete-shards.js`.
Fix: change the build-chain invocation to `node --max-old-space-size=4096 ../scripts/build-athlete-shards.js` and re-run Step 1. Commit the change.

- [ ] **Step 3: Start the production server and confirm an athlete page renders**

Run: `cd app && (npm start &) && sleep 5 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/athlete/smith-anderson--us-m && curl -s http://localhost:3000/athlete/smith-anderson--us-m | grep -o "Smith Anderson" | head -1`
Expected: `200` then `Smith Anderson` (confirms the shard read works in a real Next server and the page renders the name). Stop the server afterward (`kill %1` or pkill the next start).

- [ ] **Step 4: Confirm shards were traced into the standalone/serverless output**

Run: `cd /Users/rootulp/git/tritimes && find app/.next -type d -name "athlete-shards" | head; ls app/.next/standalone/data/athlete-shards 2>/dev/null | wc -l`
Expected: a non-empty result (shards present in the traced output). If empty, the `outputFileTracingIncludes` glob in Task 4 Step 3 is not matching — adjust the path and rebuild.

- [ ] **Step 5: Commit any tracing/heap fixes made above** (skip if none)

```bash
git add app/next.config.ts app/package.json
git commit -m "build: ensure athlete shards are bundled and build fits memory"
```

---

## Task 6: End-to-end gate (red → green)

**Files:** none (verification only)

- [ ] **Step 1: Push the branch and deploy a preview**

Run: `git push -u origin perf/journey-cold-start`
Then wait for the Vercel preview deploy (or trigger it) and capture the preview URL.

- [ ] **Step 2: Run the journey gate against the fresh preview (cold by construction)**

Run: `cd app && BASE_URL=https://<preview-url> npx playwright test journey-performance --reporter=list`
Expected: PASS — printed `Total: <n>ms` under 2,500ms. (Baseline before the fix was ~21,000ms.)

- [ ] **Step 3: If still over budget**

The Node lambda cold-boot floor may dominate. Per the spec's escalation path, move `/athlete/[slug]` to the Edge runtime (Approach C), reusing the same shards fetched over HTTP. Open this as a follow-up; do not expand this plan.

- [ ] **Step 4: Update the PR description with before/after journey numbers.**

---

## Self-Review

- **Spec coverage:** sharded self-contained artifact (Task 2), shard hash + parity (Tasks 1–2), build step in chain (Tasks 2,4), runtime shard read (Task 3), cleanup of `getProfilesMapping`/monolithic file (Task 4), file-tracing risk (Tasks 4–5), build-memory risk (Task 5), unit+integration+e2e tests (Tasks 1,2,5,6). All spec sections mapped.
- **Placeholders:** none — every code step shows full code.
- **Type consistency:** `shardId`/`SHARD_COUNT` defined in Task 1 and reused identically in Tasks 2–3; `buildAthleteRecords`/`slugifyAthlete`/`parseCSV` defined in Task 2 and consumed in Task 2's test; `AthleteProfile`/`AthleteRaceEntry` field names match `app/src/lib/types.ts`.
