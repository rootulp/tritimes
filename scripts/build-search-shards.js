#!/usr/bin/env node

/**
 * Builds prefix-sharded athlete search indexes for typeahead search:
 *   app/public/search-shards/<hex>.tsv.gz
 *
 * Each shard holds every athlete whose search keys (lowercased full name plus
 * token rotations, mirroring buildSearchKeys in app/src/lib/search-core.ts)
 * start with one 2-char prefix, so a query only ever needs the one shard for
 * its first two normalized chars (~0.2KB–1MB gz) instead of the full 9.7MB
 * index. Used by both the browser and /api/search.
 *
 * <hex> is the UTF-8 hex of the 2-char bucket — MUST stay identical to
 * shardFileName() in app/src/lib/search-core.ts (see search-shards.test.ts).
 *
 * Input: data/athlete-index.tsv.gz (committed; built by build-search-index.js)
 * Output lands in app/public/ so Next serves shards as static CDN assets.
 *
 * Run: node scripts/build-search-shards.js [--skip-if-exists]
 * Gitignored output, mirroring app/public/athlete-shards/.
 */

const fs = require("fs");
const path = require("path");
const { gzipSync, gunzipSync } = require("zlib");

const indexPath = path.join(__dirname, "..", "data", "athlete-index.tsv.gz");
const shardsDir = path.join(__dirname, "..", "app", "public", "search-shards");

// MUST stay identical to shardFileName() in app/src/lib/search-core.ts.
function shardFileName(bucket) {
  return `${Buffer.from(bucket, "utf8").toString("hex")}.tsv.gz`;
}

// Mirrors buildSearchKeys() in app/src/lib/search-core.ts: the lowercased
// full name plus every rotation of its tokens (so "smith" finds "John Smith").
function searchKeysForName(nameLower) {
  const tokens = nameLower.split(/[\s-]+/).filter(Boolean);
  const keys = new Set([nameLower]);
  for (let t = 1; t < tokens.length; t++) {
    keys.add([...tokens.slice(t), ...tokens.slice(0, t)].join(" "));
  }
  return [...keys];
}

// Distinct 2-char prefixes of a name's search keys. Keys shorter than two
// chars are skipped — they can never prefix-match a 2+ char query.
function bucketsForName(nameLower) {
  const buckets = new Set();
  for (const key of searchKeysForName(nameLower)) {
    if (key.length >= 2) buckets.add(key.slice(0, 2));
  }
  return [...buckets];
}

/**
 * @param lines TSV lines: slug\tfullName\tcountry\tcountryISO\traceCount
 * @returns Map<bucket, lines sorted by code-unit (fullNameLower, slug)>
 */
function buildShardMap(lines) {
  const shards = new Map();
  for (const line of lines) {
    if (!line) continue;
    const t1 = line.indexOf("\t");
    const t2 = line.indexOf("\t", t1 + 1);
    const nameLower = line.substring(t1 + 1, t2).toLowerCase();
    for (const bucket of bucketsForName(nameLower)) {
      let shard = shards.get(bucket);
      if (!shard) {
        shard = [];
        shards.set(bucket, shard);
      }
      shard.push({ nameLower, line });
    }
  }
  const result = new Map();
  for (const [bucket, entries] of shards) {
    // Code-unit sort by fullNameLower (binary-search precondition in
    // search-core), slug tiebreak for determinism.
    entries.sort((a, b) => {
      if (a.nameLower < b.nameLower) return -1;
      if (a.nameLower > b.nameLower) return 1;
      return a.line < b.line ? -1 : a.line > b.line ? 1 : 0;
    });
    result.set(
      bucket,
      entries.map((e) => e.line),
    );
  }
  return result;
}

// True when the shards dir already holds at least one shard file.
function shardsAlreadyBuilt() {
  try {
    return fs.readdirSync(shardsDir).some((f) => f.endsWith(".tsv.gz"));
  } catch {
    return false;
  }
}

function main() {
  // --skip-if-exists: used by `predev` so a one-time local build isn't redone
  // on every `next dev`. The production build chain runs without it and always
  // regenerates so shards reflect the latest data.
  if (process.argv.includes("--skip-if-exists") && shardsAlreadyBuilt()) {
    console.log(
      `Search shards already present → skipping. Delete ${path.relative(process.cwd(), shardsDir)} to rebuild.`,
    );
    return;
  }

  if (!fs.existsSync(indexPath)) {
    console.error(`Missing ${indexPath}. Run scripts/build-search-index.js first.`);
    process.exit(1);
  }

  const start = Date.now();
  const tsv = gunzipSync(fs.readFileSync(indexPath)).toString();
  const shards = buildShardMap(tsv.split("\n"));

  fs.rmSync(shardsDir, { recursive: true, force: true });
  fs.mkdirSync(shardsDir, { recursive: true });
  for (const [bucket, lines] of shards) {
    fs.writeFileSync(
      path.join(shardsDir, shardFileName(bucket)),
      gzipSync(lines.join("\n")),
    );
  }

  console.log(
    `Built search shards: ${shards.size} buckets in ${Date.now() - start}ms → ${path.relative(process.cwd(), shardsDir)}`,
  );
}

if (require.main === module) main();

module.exports = { shardFileName, searchKeysForName, bucketsForName, buildShardMap };
