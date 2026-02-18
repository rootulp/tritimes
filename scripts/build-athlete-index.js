#!/usr/bin/env node

// Builds a pre-computed athlete search index from all race CSVs.
// Zero dependencies — requires Node.js 18+.
//
// Usage: node build-athlete-index.js
//
// Reads data/races.json and all corresponding CSVs, deduplicates athletes,
// and writes data/athlete-index.json for fast search at runtime.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const RACES_JSON = path.join(DATA_DIR, "races.json");
const INDEX_JSON = path.join(DATA_DIR, "athlete-index.json");

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

function parseCSV(csvPath) {
  if (!fs.existsSync(csvPath)) return [];
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");

  const fullNameIdx = headers.indexOf("FullName");
  const countryIdx = headers.indexOf("Country");
  const countryISOIdx = headers.indexOf("CountryISO");
  const genderIdx = headers.indexOf("Gender");
  const statusIdx = headers.indexOf("Status");

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values[statusIdx] !== "Finisher") continue;
    results.push({
      fullName: values[fullNameIdx] || "",
      country: values[countryIdx] || "",
      countryISO: values[countryISOIdx] || "",
      gender: values[genderIdx] || "",
    });
  }
  return results;
}

function main() {
  if (!fs.existsSync(RACES_JSON)) {
    console.error(`Races manifest not found: ${RACES_JSON}`);
    process.exit(1);
  }

  const races = JSON.parse(fs.readFileSync(RACES_JSON, "utf-8"));
  console.log(`Building athlete index from ${races.length} race(s)...`);

  const map = new Map();
  let totalResults = 0;

  for (const race of races) {
    const csvPath = path.join(DATA_DIR, `${race.slug}.csv`);
    const results = parseCSV(csvPath);
    totalResults += results.length;

    for (const r of results) {
      const slug = slugifyAthlete(r.fullName, r.countryISO, r.gender);
      const existing = map.get(slug);
      if (existing) {
        existing.raceCount++;
      } else {
        map.set(slug, {
          fullName: r.fullName,
          country: r.country,
          countryISO: r.countryISO,
          gender: r.gender,
          raceCount: 1,
        });
      }
    }
  }

  // Build a country code lookup to avoid repeating full country names
  const countryCodes = new Map(); // countryISO -> country
  for (const entry of map.values()) {
    if (!countryCodes.has(entry.countryISO)) {
      countryCodes.set(entry.countryISO, entry.country);
    }
  }

  // Store compact entries (without slug or country — both are derivable)
  const entries = Array.from(map.entries()).map(([slug, a]) => [
    a.fullName,
    a.countryISO,
    a.gender,
    a.raceCount,
  ]);

  const output = {
    countries: Object.fromEntries(countryCodes),
    athletes: entries,
  };
  fs.writeFileSync(INDEX_JSON, JSON.stringify(output) + "\n");

  console.log(`Processed ${totalResults} results across ${races.length} races`);
  console.log(`Deduplicated to ${entries.length} unique athletes`);
  console.log(`Index saved: ${INDEX_JSON} (${(fs.statSync(INDEX_JSON).size / 1024 / 1024).toFixed(1)} MB)`);
}

main();
