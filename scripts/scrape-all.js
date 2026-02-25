#!/usr/bin/env node

// Batch scrapes Ironman race results and generates data/races.json manifest.
// Zero dependencies — requires Node.js 18+.
//
// Usage:
//   node scrape-all.js                    # Scrape all races from race-registry.json
//   node scrape-all.js --slug=im703-new-york  # Scrape a specific race from registry
//   node scrape-all.js --save-raw         # Also save raw JSON (gitignored)
//   node scrape-all.js --year=2025        # Only scrape races from a specific year
//   node scrape-all.js --skip-existing     # Skip races that already have a CSV file
//   node scrape-all.js --dry-run          # Show what would be scraped without fetching results

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { discover } = require("./discover");
const { fetchResults, buildRow, toCSV } = require("./scrape");

const DATA_DIR = path.join(__dirname, "..", "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const RACES_JSON = path.join(DATA_DIR, "races.json");
const REGISTRY_PATH = path.join(__dirname, "race-registry.json");

function parseArgs() {
  const args = { saveRaw: false, dryRun: false, skipExisting: false, slug: null, year: null };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--save-raw") args.saveRaw = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--skip-existing") args.skipExisting = true;
    else if (arg.startsWith("--slug=")) args.slug = arg.slice(7);
    else if (arg.startsWith("--year=")) args.year = parseInt(arg.slice(7));
  }
  return args;
}

function generateSlug(registrySlug, eventName, eventDate) {
  // Generate a slug like "im703-new-york-2025" from registry slug + event year
  const year = eventDate ? new Date(eventDate).getFullYear() : null;
  // Detect gender-specific events (e.g., "World Championship - Women")
  const name = (eventName || "").toLowerCase();
  let genderSuffix = "";
  if (name.includes("- women")) genderSuffix = "-women";
  else if (name.includes("- men")) genderSuffix = "-men";
  if (year) return `${registrySlug}${genderSuffix}-${year}`;
  // Fallback: derive from event name
  const base = eventName
    .toLowerCase()
    .replace(/ironman\s+70\.3/gi, "im703")
    .replace(/ironman/gi, "im")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

function isMainEvent(event) {
  const name = (event.name || "").toLowerCase();
  // Skip Aquabike and other non-triathlon subevents
  if (name.includes("aquabike")) return false;
  if (name.includes("relay")) return false;
  return true;
}

async function scrapeRace(entry, events, opts) {
  const results = [];

  for (const event of events) {
    if (!isMainEvent(event)) {
      console.log(`  Skipping non-triathlon event: ${event.name}`);
      continue;
    }

    const slug = generateSlug(entry.slug, event.name, event.date);
    const date = formatDate(event.date);

    console.log(`  Event: ${event.name} (${slug})`);
    console.log(`    Event ID: ${event.eventId}`);
    console.log(`    Date: ${date}`);

    if (opts.skipExisting && fs.existsSync(path.join(DATA_DIR, `${slug}.csv`))) {
      console.log(`    Skipping (CSV already exists)`);
      continue;
    }

    if (opts.dryRun) {
      results.push({ slug, name: event.name, date, location: entry.location, eventId: event.eventId, finishers: 0 });
      continue;
    }

    try {
      const data = await fetchResults(event.eventId);
      const rawResults = data?.resultsJson?.value || [];
      console.log(`    Raw results: ${rawResults.length}`);

      if (opts.saveRaw) {
        fs.mkdirSync(RAW_DIR, { recursive: true });
        const rawPath = path.join(RAW_DIR, `${slug}.json`);
        fs.writeFileSync(rawPath, JSON.stringify(data, null, 2));
        console.log(`    Raw JSON saved: ${rawPath}`);
      }

      const rows = rawResults.map(buildRow);
      const csv = toCSV(rows);
      if (csv) {
        const csvPath = path.join(DATA_DIR, `${slug}.csv`);
        fs.writeFileSync(csvPath, csv);
        const finishers = rows.filter((r) => r.Status === "Finisher").length;
        console.log(`    CSV saved: ${csvPath} (${rows.length} rows, ${finishers} finishers)`);
        results.push({ slug, name: event.name, date, location: entry.location, eventId: event.eventId, finishers });
      } else {
        console.log(`    No results to save`);
      }
    } catch (err) {
      console.error(`    Error: ${err.message}`);
    }

    // Rate-limit: 1 second between API calls
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

async function main() {
  const opts = parseArgs();

  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`Registry not found: ${REGISTRY_PATH}`);
    process.exit(1);
  }

  let registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));

  if (opts.slug) {
    registry = registry.filter((r) => r.slug === opts.slug);
    if (registry.length === 0) {
      console.error(`No race found with slug: ${opts.slug}`);
      process.exit(1);
    }
  }

  console.log(`Processing ${registry.length} race(s) from registry...\n`);

  // Load existing manifest to merge with new results
  let existingRaces = [];
  if (fs.existsSync(RACES_JSON)) {
    existingRaces = JSON.parse(fs.readFileSync(RACES_JSON, "utf-8"));
  }

  const allResults = [];

  for (const entry of registry) {
    console.log(`\nRace: ${entry.name}`);
    console.log(`  Group URL: ${entry.groupUrl}`);

    try {
      const events = await discover(entry.groupUrl);
      console.log(`  Found ${events.length} subevent(s)`);

      // Filter by year if specified
      let filtered = events;
      if (opts.year) {
        filtered = events.filter((e) => e.year === opts.year);
        console.log(`  Filtered to ${filtered.length} event(s) for year ${opts.year}`);
      }

      const results = await scrapeRace(entry, filtered, opts);
      allResults.push(...results);
    } catch (err) {
      console.error(`  Discovery error: ${err.message}`);
    }
  }

  // Merge with existing races (update existing, add new)
  const mergedMap = new Map();
  for (const race of existingRaces) {
    mergedMap.set(race.slug, race);
  }
  for (const race of allResults) {
    mergedMap.set(race.slug, race);
  }

  const manifest = Array.from(mergedMap.values()).sort((a, b) => {
    // Sort by date descending, then by name
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return a.name.localeCompare(b.name);
  });

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RACES_JSON, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nManifest saved: ${RACES_JSON} (${manifest.length} race(s))`);

  if (opts.dryRun) {
    console.log("\n(Dry run — no results were fetched)");
  } else if (allResults.length > 0) {
    // Rebuild search indexes so they stay in sync with scraped data
    console.log("\nRebuilding search indexes...");
    execFileSync(process.execPath, [path.join(__dirname, "build-search-index.js")], {
      stdio: "inherit",
    });
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
