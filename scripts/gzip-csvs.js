#!/usr/bin/env node

/**
 * Gzips all race CSV files for compact serverless deployment.
 * Runs at build time since .csv.gz files are gitignored.
 *
 * Run: node scripts/gzip-csvs.js
 */

const fs = require("fs");
const path = require("path");
const { gzipSync } = require("zlib");

const dataDir = path.join(__dirname, "..", "data");
const manifestPath = path.join(dataDir, "races.json");

const start = Date.now();
const races = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

let count = 0;
for (const race of races) {
  const csvPath = path.join(dataDir, `${race.slug}.csv`);
  if (!fs.existsSync(csvPath)) continue;
  const raw = fs.readFileSync(csvPath);
  fs.writeFileSync(`${csvPath}.gz`, gzipSync(raw));
  count++;
}

const elapsed = Date.now() - start;
console.log(`Gzipped ${count} CSV files in ${elapsed}ms`);
