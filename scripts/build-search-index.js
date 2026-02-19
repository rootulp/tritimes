#!/usr/bin/env node

/**
 * Pre-builds the deduplicated athlete search index from CSV files.
 * Outputs data/athlete-index.json for use by the /api/search endpoint.
 *
 * Run: node scripts/build-search-index.js
 */

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const manifestPath = path.join(dataDir, "races.json");
const outputPath = path.join(dataDir, "athlete-index.json");

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
const map = new Map();

for (const race of races) {
  const csvPath = path.join(dataDir, `${race.slug}.csv`);
  if (!fs.existsSync(csvPath)) continue;

  const results = parseCSV(csvPath);
  for (const r of results) {
    const slug = slugifyAthlete(r.FullName, r.CountryISO, r.Gender);
    const existing = map.get(slug);
    if (existing) {
      existing.raceCount++;
    } else {
      map.set(slug, {
        slug,
        fullName: r.FullName,
        country: r.Country,
        countryISO: r.CountryISO,
        raceCount: 1,
      });
    }
  }
}

const index = Array.from(map.values());
fs.writeFileSync(outputPath, JSON.stringify(index));

const elapsed = Date.now() - start;
console.log(
  `Built search index: ${index.length} athletes in ${elapsed}ms → ${path.relative(process.cwd(), outputPath)}`
);
