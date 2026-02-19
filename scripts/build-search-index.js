#!/usr/bin/env node

/**
 * Pre-builds athlete data indexes from CSV files:
 * - data/athlete-index.json    — deduplicated search index for /api/search
 * - data/athlete-profiles.json — slug-keyed profiles for /athlete/[slug]
 *
 * Run: node scripts/build-search-index.js
 */

const fs = require("fs");
const path = require("path");
const { gzipSync } = require("zlib");

const dataDir = path.join(__dirname, "..", "data");
const manifestPath = path.join(dataDir, "races.json");
const searchIndexPath = path.join(dataDir, "athlete-index.json.gz");
const profilesPath = path.join(dataDir, "athlete-profiles.json.gz");

function parseCSV(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
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

const start = Date.now();
const races = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

// searchMap: slug → { fullName, country, countryISO, raceCount }
const searchMap = new Map();
// profilesMap: slug → [[raceSlug, resultId], ...]
const profilesMap = new Map();

for (const race of races) {
  const csvPath = path.join(dataDir, `${race.slug}.csv`);
  if (!fs.existsSync(csvPath)) continue;

  const results = parseCSV(csvPath);
  for (const r of results) {
    const slug = slugifyAthlete(r.FullName, r.CountryISO, r.Gender);

    // Search index
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

    // Profiles index — compact [raceSlug, resultId] pairs
    const refs = profilesMap.get(slug);
    if (refs) {
      refs.push([race.slug, r._id]);
    } else {
      profilesMap.set(slug, [[race.slug, r._id]]);
    }
  }
}

// Write search index (gzipped)
const searchIndex = Array.from(searchMap.values());
fs.writeFileSync(searchIndexPath, gzipSync(JSON.stringify(searchIndex)));

// Write profiles index as { slug: [[raceSlug, resultId], ...] } (gzipped)
const profiles = Object.fromEntries(profilesMap);
fs.writeFileSync(profilesPath, gzipSync(JSON.stringify(profiles)));

const elapsed = Date.now() - start;
console.log(
  `Built search index: ${searchIndex.length} athletes in ${elapsed}ms → ${path.relative(process.cwd(), searchIndexPath)}`
);
console.log(
  `Built profiles index: ${profilesMap.size} athletes → ${path.relative(process.cwd(), profilesPath)}`
);
