#!/usr/bin/env node

/**
 * Pre-builds athlete data indexes from CSV files:
 * - data/athlete-index.json.gz    — deduplicated search index for /api/search
 * - data/athlete-profiles.json.gz — slug-keyed profiles for /athlete/[slug]
 * - data/course-stats.json.gz     — per-course median stats for /races
 * - data/aggregate-stats.json.gz  — global aggregate stats for /stats
 *
 * Run: node scripts/build-search-index.js
 *
 * These indexes are committed to git so Vercel builds skip CSV parsing.
 * This script is run automatically after scraping (scrape-all.js).
 */

const fs = require("fs");
const path = require("path");
const { gzipSync } = require("zlib");

const dataDir = path.join(__dirname, "..", "data");
const manifestPath = path.join(dataDir, "races.json");
const searchIndexPath = path.join(dataDir, "athlete-index.json.gz");
const profilesPath = path.join(dataDir, "athlete-profiles.json.gz");
const courseStatsPath = path.join(dataDir, "course-stats.json.gz");
const aggregateStatsPath = path.join(dataDir, "aggregate-stats.json.gz");

/**
 * Parse RFC 4180 CSV text into rows of string arrays.
 * Handles quoted fields that contain newlines, commas, and escaped quotes.
 */
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
        if (i + 1 < raw.length && raw[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r" && i + 1 < raw.length && raw[i + 1] === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += 2;
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseCSV(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSVRows(raw);
  if (rows.length === 0) return [];

  const headers = rows[0];
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    if (row.Status !== "Finisher") continue;
    row._id = i - 1; // 0-based row index, matches data.ts parseCSV
    results.push(row);
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
  const country = countryISO.toLowerCase();
  const g = gender.toLowerCase().charAt(0);
  return `${base}--${country}-${g}`;
}

function computeMedian(values) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function stripPrefix(name) {
  return name
    .replace(/^\d{4}\s+/, "")
    .replace(/^IRONMAN\s+70\.3\s+/i, "")
    .replace(/^IRONMAN\s+/i, "");
}

const start = Date.now();
const races = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

// searchMap: slug → { fullName, country, countryISO, raceCount }
const searchMap = new Map();
// profilesMap: slug → [[raceSlug, resultId], ...]
const profilesMap = new Map();
// courseMap: base slug → { course, displayName, distance, editions, *Seconds[] }
const courseMap = new Map();

// Aggregate stats collectors
const countryCounts = new Map(); // countryISO → count
const ageGroupCounts = new Map(); // ageGroup → count
let maleCount = 0;
let femaleCount = 0;
let totalFinishSeconds = 0;
let totalFinishCount = 0;

// Records: fastest/slowest overall, fastest per discipline
let fastestFinish = { seconds: Infinity, fullName: "", raceSlug: "", resultId: 0, time: "" };
let slowestFinish = { seconds: 0, fullName: "", raceSlug: "", resultId: 0, time: "" };
let fastestSwim = { seconds: Infinity, fullName: "", raceSlug: "", resultId: 0, time: "" };
let fastestBike = { seconds: Infinity, fullName: "", raceSlug: "", resultId: 0, time: "" };
let fastestRun = { seconds: Infinity, fullName: "", raceSlug: "", resultId: 0, time: "" };

// Per-race aggregate data for race-level stats
const raceAggregates = []; // { slug, name, avgTransition, finishSpread, competitiveness }

// Single pass: build all indexes from one CSV read per race
for (const race of races) {
  const csvPath = path.join(dataDir, `${race.slug}.csv`);
  if (!fs.existsSync(csvPath)) continue;

  // Initialize course stats entry
  const base = race.slug.replace(/-\d{4}$/, "");
  if (!courseMap.has(base)) {
    courseMap.set(base, {
      course: base,
      displayName: stripPrefix(race.name),
      distance: base.startsWith("im703-") ? "70.3" : "140.6",
      editions: 0,
      swimSeconds: [],
      bikeSeconds: [],
      runSeconds: [],
      finishSeconds: [],
    });
  }
  const courseEntry = courseMap.get(base);
  courseEntry.editions++;

  const results = parseCSV(csvPath);

  // Per-race tracking for race-level stats
  let raceTransitionSum = 0;
  let raceTransitionCount = 0;
  const raceFinishTimes = [];

  for (const r of results) {
    // Search index
    const slug = slugifyAthlete(r.FullName, r.CountryISO, r.Gender);
    const existing = searchMap.get(slug);
    if (existing) {
      existing.raceCount++;
    } else {
      searchMap.set(slug, {
        slug,
        fullName: r.FullName,
        country: r.Country,
        countryISO: r.CountryISO,
        raceCount: 1,
      });
    }

    // Profiles index
    const refs = profilesMap.get(slug);
    if (refs) {
      refs.push([race.slug, r._id]);
    } else {
      profilesMap.set(slug, [[race.slug, r._id]]);
    }

    // Course stats
    const swim = Number(r.SwimSeconds) || 0;
    const bike = Number(r.BikeSeconds) || 0;
    const run = Number(r.RunSeconds) || 0;
    const finish = Number(r.FinishSeconds) || 0;
    if (swim > 0) courseEntry.swimSeconds.push(swim);
    if (bike > 0) courseEntry.bikeSeconds.push(bike);
    if (run > 0) courseEntry.runSeconds.push(run);
    if (finish > 0) courseEntry.finishSeconds.push(finish);

    // Aggregate stats: country
    const iso = r.CountryISO;
    if (iso) countryCounts.set(iso, (countryCounts.get(iso) || 0) + 1);

    // Aggregate stats: age group
    const ag = r.AgeGroup;
    if (ag) ageGroupCounts.set(ag, (ageGroupCounts.get(ag) || 0) + 1);

    // Aggregate stats: gender
    if (r.Gender === "Male") maleCount++;
    else if (r.Gender === "Female") femaleCount++;

    // Aggregate stats: finish time sum
    if (finish > 0) {
      totalFinishSeconds += finish;
      totalFinishCount++;
      raceFinishTimes.push(finish);
    }

    // Records: fastest/slowest finish
    if (finish > 0 && finish < fastestFinish.seconds) {
      fastestFinish = { seconds: finish, fullName: r.FullName, raceSlug: race.slug, resultId: r._id, time: r.FinishTime };
    }
    if (finish > 0 && finish > slowestFinish.seconds) {
      slowestFinish = { seconds: finish, fullName: r.FullName, raceSlug: race.slug, resultId: r._id, time: r.FinishTime };
    }

    // Records: fastest splits
    if (swim > 0 && swim < fastestSwim.seconds) {
      fastestSwim = { seconds: swim, fullName: r.FullName, raceSlug: race.slug, resultId: r._id, time: r.SwimTime };
    }
    if (bike > 0 && bike < fastestBike.seconds) {
      fastestBike = { seconds: bike, fullName: r.FullName, raceSlug: race.slug, resultId: r._id, time: r.BikeTime };
    }
    if (run > 0 && run < fastestRun.seconds) {
      fastestRun = { seconds: run, fullName: r.FullName, raceSlug: race.slug, resultId: r._id, time: r.RunTime };
    }

    // Per-race: transition time
    const t1 = Number(r.T1Seconds) || 0;
    const t2 = Number(r.T2Seconds) || 0;
    if (t1 > 0 && t2 > 0) {
      raceTransitionSum += t1 + t2;
      raceTransitionCount++;
    }
  }

  // Per-race aggregates
  if (raceFinishTimes.length > 0) {
    raceFinishTimes.sort((a, b) => a - b);
    const spread = raceFinishTimes[raceFinishTimes.length - 1] - raceFinishTimes[0];
    const competitiveness = raceFinishTimes.length >= 10
      ? raceFinishTimes[9] - raceFinishTimes[0]
      : 0;
    const avgTransition = raceTransitionCount > 0
      ? Math.round(raceTransitionSum / raceTransitionCount)
      : 0;
    raceAggregates.push({
      slug: race.slug,
      name: race.name,
      finisherCount: raceFinishTimes.length,
      avgTransition,
      finishSpread: spread,
      competitiveness,
    });
  }
}

// Write search index (gzipped)
const searchIndex = Array.from(searchMap.values());
fs.writeFileSync(searchIndexPath, gzipSync(JSON.stringify(searchIndex)));

// Write profiles index as { slug: [[raceSlug, resultId], ...] } (gzipped)
const profiles = Object.fromEntries(profilesMap);
fs.writeFileSync(profilesPath, gzipSync(JSON.stringify(profiles)));

// Write course stats (gzipped)
const courseStats = Array.from(courseMap.values()).map((c) => ({
  course: c.course,
  displayName: c.displayName,
  distance: c.distance,
  editions: c.editions,
  totalFinishers: c.finishSeconds.length,
  medianSwimSeconds: computeMedian(c.swimSeconds),
  medianBikeSeconds: computeMedian(c.bikeSeconds),
  medianRunSeconds: computeMedian(c.runSeconds),
  medianFinishSeconds: computeMedian(c.finishSeconds),
}));
fs.writeFileSync(courseStatsPath, gzipSync(JSON.stringify(courseStats)));

// Build aggregate stats
const sortedCountries = Array.from(countryCounts.entries()).sort((a, b) => b[1] - a[1]);
const sortedAgeGroups = Array.from(ageGroupCounts.entries()).sort((a, b) => b[1] - a[1]);

// Race-level records
const sortedByTransition = raceAggregates.filter((r) => r.avgTransition > 0).sort((a, b) => b.avgTransition - a.avgTransition);
const sortedBySpreadAsc = raceAggregates.filter((r) => r.finisherCount >= 50).sort((a, b) => a.finishSpread - b.finishSpread);
const sortedBySpreadDesc = raceAggregates.filter((r) => r.finisherCount >= 50).sort((a, b) => b.finishSpread - a.finishSpread);
const sortedByCompetitiveness = raceAggregates.filter((r) => r.competitiveness > 0).sort((a, b) => a.competitiveness - b.competitiveness);

const aggregateStats = {
  uniqueCountries: countryCounts.size,
  mostCommonCountry: sortedCountries.length > 0 ? { countryISO: sortedCountries[0][0], count: sortedCountries[0][1] } : null,
  fastestFinish,
  slowestFinish,
  fastestSwim,
  fastestBike,
  fastestRun,
  averageFinishSeconds: totalFinishCount > 0 ? Math.round(totalFinishSeconds / totalFinishCount) : 0,
  mostCommonAgeGroup: sortedAgeGroups.length > 0 ? { ageGroup: sortedAgeGroups[0][0], count: sortedAgeGroups[0][1] } : null,
  maleCount,
  femaleCount,
  longestAvgTransition: sortedByTransition.length > 0 ? { slug: sortedByTransition[0].slug, name: sortedByTransition[0].name, seconds: sortedByTransition[0].avgTransition } : null,
  tightestFinishSpread: sortedBySpreadAsc.length > 0 ? { slug: sortedBySpreadAsc[0].slug, name: sortedBySpreadAsc[0].name, seconds: sortedBySpreadAsc[0].finishSpread } : null,
  widestFinishSpread: sortedBySpreadDesc.length > 0 ? { slug: sortedBySpreadDesc[0].slug, name: sortedBySpreadDesc[0].name, seconds: sortedBySpreadDesc[0].finishSpread } : null,
  mostCompetitiveRace: sortedByCompetitiveness.length > 0 ? { slug: sortedByCompetitiveness[0].slug, name: sortedByCompetitiveness[0].name, seconds: sortedByCompetitiveness[0].competitiveness } : null,
};
fs.writeFileSync(aggregateStatsPath, gzipSync(JSON.stringify(aggregateStats)));

const elapsed = Date.now() - start;
console.log(
  `Built search index: ${searchIndex.length} athletes in ${elapsed}ms → ${path.relative(process.cwd(), searchIndexPath)}`
);
console.log(
  `Built profiles index: ${profilesMap.size} athletes → ${path.relative(process.cwd(), profilesPath)}`
);
console.log(
  `Built course stats: ${courseStats.length} courses → ${path.relative(process.cwd(), courseStatsPath)}`
);
console.log(
  `Built aggregate stats: ${aggregateStats.uniqueCountries} countries → ${path.relative(process.cwd(), aggregateStatsPath)}`
);
