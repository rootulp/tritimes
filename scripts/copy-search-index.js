#!/usr/bin/env node

/**
 * Mirrors data/athlete-index.tsv.gz into app/public/ so Next.js serves it
 * as a static asset to the browser for client-side search. Run from npm
 * predev and from the build chain — the source file is committed to git,
 * so this is a cheap deterministic copy with no parsing.
 */

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "data", "athlete-index.tsv.gz");
const dst = path.join(__dirname, "..", "app", "public", "athlete-index.tsv.gz");

if (!fs.existsSync(src)) {
  console.error(`Missing ${src}. Run scripts/build-search-index.js first.`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);

const bytes = fs.statSync(dst).size;
console.log(`Copied search index → ${path.relative(process.cwd(), dst)} (${bytes} bytes)`);
