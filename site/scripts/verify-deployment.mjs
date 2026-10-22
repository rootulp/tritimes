// Validate the actual CDN routing/TLS without changing browser trust settings.
// Uses curl's configured proxy/CA trust; requires a built dist/ directory.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
const exec = promisify(execFile);
const base = process.env.DEPLOYMENT_URL;
assert(base && /^https:\/\//.test(base), "Set DEPLOYMENT_URL to the deployed HTTPS URL");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const routes = walk("dist").filter((f) => f.endsWith(".html") && f !== "dist/404.html")
  .map((f) => "/" + f.slice(5).replace(/\.html$/, "").replace(/^index$/, ""));
routes.push("/robots.txt", "/sitemap.xml", "/athlete/rootul-patel--us-m", "/race/im-arizona-2025/result/0");
const rows = [];
let next = 0;
const startedAt = new Date().toISOString();
async function head(route) {
  const { stdout } = await exec("curl", ["--silent", "--show-error", "--head", "--location", "--max-time", "30",
    "--output", "/dev/null", "--write-out", "%{http_code}\t%{content_type}\t%{time_starttransfer}", base + route]);
  const [status, contentType, ttfb] = stdout.split("\t");
  return { route, status: Number(status), contentType, ttfbSeconds: Number(ttfb) };
}
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < routes.length) {
    const route = routes[next++];
    try { rows.push(await head(route)); }
    catch (error) { rows.push({ route, error: error.message }); }
  }
}));
for (const row of rows) {
  assert.equal(row.status, 200, `${row.route}: ${JSON.stringify(row)}`);
  assert.match(row.contentType, row.route.endsWith(".xml") ? /xml/ : row.route.endsWith(".txt") ? /text\/plain/ : /text\/html/, row.route);
}
for (const route of ["/race/no-such-race", "/courses/no-such-course", "/courses/im703-swansea/1999", "/no-such-page"]) {
  assert.equal((await head(route)).status, 404, `${route}: expected a true 404`);
}
const dataChecks = [];
for (const file of ["race/im-arizona-2025.json.gz", "course/im703-swansea.json.gz", "races.json.gz"]) {
  const { stdout } = await exec("curl", ["--fail", "--silent", "--show-error", "--max-time", "30", base + "/data/" + file], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 });
  assert.deepEqual(stdout, fs.readFileSync("dist/data/" + file), file + ": CDN bytes equal the build");
  JSON.parse(gunzipSync(stdout).toString());
  dataChecks.push(file);
}
const splitPrefixes = JSON.parse(fs.readFileSync(".cache/search-partitions.json", "utf8"));
const searchChecks = [];
for (const query of ["rootul patel", "mark smith", "maria garcia"]) {
  let prefix = query.slice(0, 2);
  while (prefix.length < query.length && splitPrefixes.includes(prefix)) prefix = query.slice(0, prefix.length + 1);
  const file = `search-shards/fine/${Buffer.from(prefix).toString("hex")}.tsv.gz`;
  const { stdout } = await exec("curl", ["--fail", "--silent", "--show-error", "--max-time", "30", base + "/" + file], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 });
  assert.deepEqual(stdout, fs.readFileSync("dist/" + file), `${file}: CDN search bytes equal the build`);
  assert(gunzipSync(stdout).toString().includes("\t"), "Decoded search TSV");
  searchChecks.push(file);
}
const report = {
  startedAt, finishedAt: new Date().toISOString(), base, routesChecked: rows.length,
  routesSha256: createHash("sha256").update([...routes].sort().join("\n")).digest("hex"),
  allStatuses200: true, missingStaticRoutesReturn404: true, dataChecks, searchChecks,
  method: "HEAD every generated HTML route plus robots, sitemap and representative rewritten URLs; GET/decompress/byte-compare representative data. curl retains configured TLS verification and proxy trust. This is HTTP/data verification, not a live browser interaction test.",
};
fs.mkdirSync("artifacts/deployment", { recursive: true });
fs.writeFileSync("artifacts/deployment/summary.json", JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync("artifacts/deployment/routes.json", JSON.stringify(rows, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
