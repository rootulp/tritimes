#!/usr/bin/env node

/**
 * Pre-builds athlete data indexes from CSV files:
 * - data/athlete-index.json.gz    — deduplicated search index for /api/search
 * - data/athlete-profiles.json.gz — slug-keyed profiles for /athlete/[slug]
 * - data/course-stats.json.gz     — per-course median stats for /races
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

// Single pass: build all three indexes from one CSV read per race
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
