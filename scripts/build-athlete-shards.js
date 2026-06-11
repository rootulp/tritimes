#!/usr/bin/env node

/**
 * Builds sharded, self-contained athlete profiles for /athlete/[slug]:
 *   app/public/athlete-shards/<id>.json.gz   — { [slug]: AthleteProfile }
 *
 * Each profile precomputes overallPercentile and every field the page renders,
 * so a request fetches ONE small shard (no 80MB profiles parse, no CSV parsing).
 *
 * Output lands in app/public/ so Next serves the shards as static CDN assets at
 * /athlete-shards/<id>.json.gz. They are NOT bundled into the serverless
 * function (1024 × ~145KB would exceed the 250MB function size limit) — the
 * athlete page fetches the one shard it needs over HTTP at render time.
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
const shardsDir = path.join(__dirname, "..", "app", "public", "athlete-shards");

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
    .replace(/[\u0300-\u036f]/g, "")
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

// True when the shards dir already holds a full set of files.
function shardsAlreadyBuilt() {
  try {
    return fs.readdirSync(shardsDir).filter((f) => f.endsWith(".json.gz")).length === SHARD_COUNT;
  } catch {
    return false;
  }
}

function main() {
  // --skip-if-exists: used by `predev` so a one-time local build isn't redone on
  // every `next dev`. The production build chain runs without it and always
  // regenerates so shards reflect the latest data.
  if (process.argv.includes("--skip-if-exists") && shardsAlreadyBuilt()) {
    console.log(
      `Athlete shards already present (${SHARD_COUNT} files) → skipping. Delete ${path.relative(process.cwd(), shardsDir)} to rebuild.`,
    );
    return;
  }

  const start = Date.now();
  const races = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const records = buildAthleteRecords(races, (slug) => {
    const p = path.join(dataDir, `${slug}.csv`);
    if (!fs.existsSync(p)) {
      // Skip (matching build-search-index.js / build-histograms.js) rather than
      // fail the build, but warn so a missing CSV isn't silently dropped.
      console.warn(`  warning: no CSV for race "${slug}" (${path.relative(process.cwd(), p)}) — skipping`);
      return null;
    }
    return fs.readFileSync(p, "utf-8");
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
