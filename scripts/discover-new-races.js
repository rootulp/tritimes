#!/usr/bin/env node

// Discovers new IRONMAN and IRONMAN 70.3 races by crawling the ironman.com
// XML sitemap and comparing against the existing race-registry.json.
// Zero dependencies — requires Node.js 18+.
//
// Usage:
//   node discover-new-races.js [--dry-run]

const fs = require("fs");
const path = require("path");
const {
  extractGroupUUID,
  discoverFromGroupPage,
  fetchHTML,
} = require("./discover.js");

const SITEMAP_INDEX_URL = "https://www.ironman.com/sitemap.xml";
const REGISTRY_PATH = path.join(__dirname, "race-registry.json");

// Match IM and IM 70.3 results pages, e.g.:
//   /races/im-arizona/results
//   /races/im703-new-york/results
const RESULTS_URL_PATTERN =
  /https:\/\/www\.ironman\.com\/races\/(im(?:703)?-[a-z0-9-]+)\/results/g;

function parseLocs(xml) {
  const locs = [];
  const pattern = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    locs.push(match[1]);
  }
  return locs;
}

async function fetchSitemapIndex() {
  console.error(`Fetching sitemap index: ${SITEMAP_INDEX_URL}`);
  const xml = await fetchHTML(SITEMAP_INDEX_URL);
  return parseLocs(xml);
}

async function fetchChildSitemap(url) {
  console.error(`Fetching child sitemap: ${url}`);
  const xml = await fetchHTML(url);
  return parseLocs(xml);
}

function extractRaceSlugs(urls) {
  const slugs = new Set();
  for (const url of urls) {
    RESULTS_URL_PATTERN.lastIndex = 0;
    const match = RESULTS_URL_PATTERN.exec(url);
    if (match) {
      slugs.add(match[1]);
    }
  }
  return [...slugs];
}

function extractRaceName(html) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  if (!match) return null;
  let title = match[1].trim();
  // Title format is typically "Results | IRONMAN Maryland" — take the part after "|"
  if (title.includes("|")) {
    title = title.split("|").pop().trim();
  }
  // Remove trailing suffixes and decode HTML entities
  return title
    .replace(/\s*-\s*Results$/, "")
    .replace(/\s*Results$/, "")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim() || null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.error("Dry run mode — no changes will be written");
  }

  // Load existing registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  const existingSlugs = new Set(registry.map((r) => r.slug));
  const existingGroupUrls = new Set(registry.map((r) => r.groupUrl));
  console.error(`Existing registry has ${existingSlugs.size} races`);

  // Fetch sitemap index and all child sitemaps
  let sitemapUrls;
  try {
    sitemapUrls = await fetchSitemapIndex();
  } catch (err) {
    console.error(`Failed to fetch sitemap index: ${err.message}`);
    process.exit(0); // Exit cleanly so GitHub Action continues
  }

  // Collect all URLs from child sitemaps
  const allUrls = [];
  for (const sitemapUrl of sitemapUrls) {
    try {
      const urls = await fetchChildSitemap(sitemapUrl);
      allUrls.push(...urls);
    } catch (err) {
      console.error(`Warning: failed to fetch ${sitemapUrl}: ${err.message}`);
    }
  }

  console.error(`Found ${allUrls.length} total URLs across all sitemaps`);

  // Extract race slugs from results page URLs
  const allSlugs = extractRaceSlugs(allUrls);
  console.error(`Found ${allSlugs.length} race results page slugs`);

  // Filter to new races only
  const newSlugs = allSlugs.filter((slug) => !existingSlugs.has(slug));
  console.error(`Found ${newSlugs.length} new race slugs`);

  if (newSlugs.length === 0) {
    console.error("No new races to discover");
    return;
  }

  console.error(`\nNew slugs to process: ${newSlugs.join(", ")}\n`);

  // Process each new slug
  const newEntries = [];
  for (const slug of newSlugs) {
    const resultsUrl = `https://www.ironman.com/races/${slug}/results`;
    console.error(`Processing ${slug}...`);

    try {
      // Fetch the ironman.com results page
      const html = await fetchHTML(resultsUrl);

      // Extract competitor.com group UUID
      const groupUUID = extractGroupUUID(html);
      if (!groupUUID) {
        console.error(`  Warning: no group UUID found for ${slug}, skipping`);
        continue;
      }

      // Skip if this group URL already exists (duplicate/alias of existing race)
      const groupUrl = `https://labs-v2.competitor.com/results/event/${groupUUID}`;
      if (existingGroupUrls.has(groupUrl)) {
        console.error(`  Skipping: group URL already in registry (duplicate)`);
        continue;
      }

      // Validate the UUID returns actual subevents
      try {
        const subevents = await discoverFromGroupPage(groupUUID);
        if (subevents.length === 0) {
          console.error(
            `  Warning: no subevents found for ${slug}, skipping`
          );
          continue;
        }
        console.error(`  Found ${subevents.length} subevents`);
      } catch (err) {
        console.error(
          `  Warning: failed to validate group UUID for ${slug}: ${err.message}`
        );
        continue;
      }

      // Extract race name from the page title
      const name = extractRaceName(html) || slug;

      const entry = { slug, name, location: "", groupUrl };

      newEntries.push(entry);
      existingGroupUrls.add(groupUrl); // Prevent duplicates within this run
      console.error(`  Added: ${name} (${groupUUID})`);
    } catch (err) {
      console.error(
        `  Warning: failed to process ${slug}: ${err.message}`
      );
    }
  }

  if (newEntries.length === 0) {
    console.error("\nNo valid new races found after processing");
    return;
  }

  // Append new entries and sort by slug
  const updatedRegistry = [...registry, ...newEntries].sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );

  if (dryRun) {
    console.error(`\nDry run: would add ${newEntries.length} new races:`);
    for (const entry of newEntries) {
      console.error(`  - ${entry.slug}: ${entry.name}`);
    }
  } else {
    fs.writeFileSync(
      REGISTRY_PATH,
      JSON.stringify(updatedRegistry, null, 2) + "\n"
    );
    console.error(`\nAdded ${newEntries.length} new races to registry`);
  }

  // Print summary to stdout
  console.log(
    JSON.stringify(
      { added: newEntries.length, races: newEntries.map((e) => e.slug) },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
