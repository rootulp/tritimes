#!/usr/bin/env node

// Scrapes IronMan race results from the Competitor.com API.
// Zero dependencies — requires Node.js 18+.
//
// Usage: node scrape.js <slug> [event-id] [--no-raw]
// Example: node scrape.js im703-new-york-2025 d6d5f967-fe97-49ea-b497-c80584cce98c

const fs = require("fs");
const path = require("path");

const RACES = {
  "im703-new-york-2025": "d6d5f967-fe97-49ea-b497-c80584cce98c",
  "im703-musselman-2025": "ca5c4954-e274-4358-b921-868097a625cb",
};

const BASE_URL = "https://labs-v2.competitor.com";

function escapeCSV(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function determineStatus(r) {
  if (r.wtc_dq) return "DQ";
  if (r.wtc_dns) return "DNS";
  if (r.wtc_dnf) return "DNF";
  if (r.wtc_finisher) return "Finisher";
  if (r.wtc_finishtimeformatted) return "Unofficial";
  return "Unknown";
}

function buildRow(r) {
  const contact = r.wtc_ContactId || {};
  const country = r.wtc_CountryRepresentingId || {};
  const ageGroup = r.wtc_AgeGroupId || {};

  return {
    FirstName: contact.firstname || "",
    LastName: contact.lastname || "",
    FullName: contact.fullname || r.athlete || "",
    Bib: r.bib || r.wtc_bibnumber || "",
    AgeGroup: ageGroup.wtc_agegroupname || r._wtc_agegroupid_value_formatted || "",
    Gender: contact.gendercode_formatted || "",
    City: contact.address1_city || "",
    State: contact.address1_stateorprovince || "",
    Country: country.wtc_name || r._wtc_countryrepresentingid_value_formatted || "",
    CountryISO: r.countryiso2 || country.wtc_iso2 || "",
    SwimTime: r.wtc_swimtimeformatted || "",
    BikeTime: r.wtc_biketimeformatted || "",
    RunTime: r.wtc_runtimeformatted || "",
    T1Time: r.wtc_transition1timeformatted || "",
    T2Time: r.wtc_transitiontime2formatted || "",
    FinishTime: r.wtc_finishtimeformatted || "",
    SwimSeconds: r.wtc_swimtime ?? "",
    BikeSeconds: r.wtc_biketime ?? "",
    RunSeconds: r.wtc_runtime ?? "",
    T1Seconds: r.wtc_transition1time ?? "",
    T2Seconds: r.wtc_transition2time ?? "",
    FinishSeconds: r.wtc_finishtime ?? "",
    OverallRank: r.wtc_finishrankoverall ?? "",
    GenderRank: r.wtc_finishrankgender ?? "",
    AgeGroupRank: r.wtc_finishrankgroup ?? "",
    SwimRankOverall: r.wtc_swimrankoverall ?? "",
    SwimRankGender: r.wtc_swimrankgender ?? "",
    SwimRankGroup: r.wtc_swimrankgroup ?? "",
    BikeRankOverall: r.wtc_bikerankoverall ?? "",
    BikeRankGender: r.wtc_bikerankgender ?? "",
    BikeRankGroup: r.wtc_bikerankgroup ?? "",
    RunRankOverall: r.wtc_runrankoverall ?? "",
    RunRankGender: r.wtc_runrankgender ?? "",
    RunRankGroup: r.wtc_runrankgroup ?? "",
    Status: determineStatus(r),
    Points: r.wtc_points ?? "",
  };
}

function toCSV(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

async function fetchResults(eventId) {
  const url = `${BASE_URL}/api/results?wtc_eventid=${eventId}`;
  console.log(`Fetching results from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// When required as a module, export reusable functions
module.exports = { fetchResults, buildRow, toCSV, escapeCSV, determineStatus, BASE_URL };

// Only run main when executed directly
if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
  const noRaw = flags.includes("--no-raw");

  const slug = args[0];
  const eventId = args[1] || RACES[slug];

  if (!slug || !eventId) {
    console.log("Usage: node scrape.js <slug> [event-id] [--no-raw]");
    console.log("\nKnown races:");
    for (const [s, id] of Object.entries(RACES)) {
      console.log(`  ${s}  ${id}`);
    }
    process.exit(1);
  }

  const RAW_DIR = path.join(__dirname, "..", "data", "raw");
  const DATA_DIR = path.join(__dirname, "..", "data");

  async function main() {
    console.log(`Scraping: ${slug} (${eventId})`);

    const data = await fetchResults(eventId);
    const results = data?.resultsJson?.value || [];
    console.log(`Received ${results.length} results`);

    if (!noRaw) {
      fs.mkdirSync(RAW_DIR, { recursive: true });
      const rawPath = path.join(RAW_DIR, `${slug}.json`);
      fs.writeFileSync(rawPath, JSON.stringify(data, null, 2));
      console.log(`Raw JSON saved to ${rawPath}`);
    }

    const rows = results.map(buildRow);
    const csv = toCSV(rows);
    const csvPath = path.join(DATA_DIR, `${slug}.csv`);
    fs.writeFileSync(csvPath, csv);
    console.log(`CSV saved to ${csvPath} (${rows.length} rows)`);
  }

  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
