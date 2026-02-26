#!/usr/bin/env node

/**
 * Precomputes histogram bin data for each race, per discipline, per scope (overall + per age group).
 * Stores as data/histograms/{slug}.json.gz
 *
 * This eliminates on-demand CSV parsing for result pages.
 * Also precomputes race-level stats (for /race/[slug] pages).
 *
 * Run: node scripts/build-histograms.js
 */

const fs = require("fs");
const path = require("path");
const { gzipSync } = require("zlib");

const dataDir = path.join(__dirname, "..", "data");
const manifestPath = path.join(dataDir, "races.json");
const histogramsDir = path.join(dataDir, "histograms");

const BIN_SIZES = {
  swim: 300,    // 5-minute bins
  bike: 600,    // 10-minute bins
  run: 600,     // 10-minute bins
  finish: 600,  // 10-minute bins
  t1: 60,       // 1-minute bins
  t2: 60,       // 1-minute bins
};

const DISCIPLINES = ["swim", "bike", "run", "finish", "t1", "t2"];

const SECONDS_FIELDS = {
  swim: "SwimSeconds",
  bike: "BikeSeconds",
  run: "RunSeconds",
  finish: "FinishSeconds",
  t1: "T1Seconds",
  t2: "T2Seconds",
};

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

function formatSecondsShort(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}m`;
}

function computeMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeBins(allSeconds, binSize) {
  const valid = allSeconds.filter((s) => s > 0);
  if (valid.length === 0) return { bins: [], medianSeconds: 0, totalAthletes: 0 };

  const min = Math.floor(Math.min(...valid) / binSize) * binSize;
  const max = Math.ceil(Math.max(...valid) / binSize) * binSize;

  const bins = [];
  for (let start = min; start < max; start += binSize) {
    const end = start + binSize;
    const count = valid.filter((s) => s >= start && s < end).length;
    bins.push({
      label: formatSecondsShort(start),
      rangeStart: start,
      rangeEnd: end,
      count,
    });
  }

  const medianSeconds = computeMedian(valid);
  return { bins, medianSeconds, totalAthletes: valid.length };
}

function parseRaceCSV(slug) {
  const csvPath = path.join(dataDir, `${slug}.csv`);
  if (!fs.existsSync(csvPath)) return [];

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
    results.push(row);
  }
  return results;
}

const start = Date.now();
const races = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

if (!fs.existsSync(histogramsDir)) {
  fs.mkdirSync(histogramsDir, { recursive: true });
}

let count = 0;
for (const race of races) {
  const results = parseRaceCSV(race.slug);
  if (results.length === 0) continue;

  // Group results by age group
  const ageGroups = new Map();
  for (const r of results) {
    const ag = r.AgeGroup || "";
    if (!ageGroups.has(ag)) ageGroups.set(ag, []);
    ageGroups.get(ag).push(r);
  }

  const data = {};

  for (const discipline of DISCIPLINES) {
    const field = SECONDS_FIELDS[discipline];
    const binSize = BIN_SIZES[discipline];

    // Overall bins
    const allSeconds = results.map((r) => Number(r[field]) || 0);
    const overall = computeBins(allSeconds, binSize);

    // Per age group bins
    const perAgeGroup = {};
    for (const [ag, group] of ageGroups) {
      const agSeconds = group.map((r) => Number(r[field]) || 0);
      perAgeGroup[ag] = computeBins(agSeconds, binSize);
    }

    data[discipline] = { overall, perAgeGroup };
  }

  const outPath = path.join(histogramsDir, `${race.slug}.json.gz`);
  fs.writeFileSync(outPath, gzipSync(JSON.stringify(data)));
  count++;
}

const elapsed = Date.now() - start;
console.log(`Precomputed histograms for ${count} races in ${elapsed}ms`);
