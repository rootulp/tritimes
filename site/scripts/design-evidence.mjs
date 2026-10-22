/** Package real browser captures and concise provenance after test:design/e2e.
 * No image generation, retouching, or screenshot baselines are used here.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const out = "docs/design-evidence";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const main = read("artifacts/design/results.json");
// Optional: a targeted follow-up run can be kept separately instead of
// overwriting the full matrix report and its screenshot attachments.
const journeys = fs.existsSync("artifacts/design/journeys.json") ? read("artifacts/design/journeys.json") : null;
const parity = read("artifacts/design/parity.json");
for (const report of [main, journeys, parity].filter(Boolean)) {
  assert.equal(report.stats.unexpected, 0, "Evidence requires a passing run");
  assert.equal(report.stats.skipped, 0, "Evidence must not hide skipped checks");
  assert.equal(report.stats.flaky, 0, "Record flaky runs explicitly rather than passing this gate");
}

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  }).sort();
}
const inputs = [...files("src"), "astro.config.mjs", "package-lock.json", "tsconfig.json"];
const sourceFiles = inputs.sort().map((file) => ({ file, sha256: sha(fs.readFileSync(file)) }));
fs.mkdirSync(out, { recursive: true });
const screenshots = files("artifacts/design/screenshots").map((file) => {
  const name = path.basename(file);
  const selected = /--(?:home|result)--/.test(name) || /^mobile-webkit--(?:athlete|courses)--/.test(name);
  if (selected) fs.copyFileSync(file, path.join(out, name));
  return { file: name, sha256: sha(fs.readFileSync(file)), committed: selected };
});

const environments = [];
const audits = [];
function collect(suite) {
  for (const spec of suite.specs ?? []) for (const test of spec.tests) for (const result of test.results) {
    const attachment = (name) => result.attachments?.find((a) => a.name === name);
    function data(a) { return a?.body ? JSON.parse(Buffer.from(a.body, "base64").toString()) : a?.path ? read(a.path) : null; }
    const env = data(attachment("environment.json"));
    const audit = data(attachment("accessibility.json"));
    if (env) environments.push(env);
    if (audit) audits.push({ project: test.projectName, title: spec.title, violations: audit.violations.length, incomplete: audit.incomplete.length, axeVersion: audit.testEngine.version });
  }
  for (const child of suite.suites ?? []) collect(child);
}
for (const suite of main.suites) collect(suite);
assert.equal(environments.length, 100, "Ten routes × two themes × five browser projects");
assert.equal(audits.length, 100);
assert(audits.every((audit) => audit.violations === 0));
const report = {
  generatedAt: new Date().toISOString(),
  baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  applicationSourceSha256: sha(JSON.stringify(sourceFiles)),
  sourceFiles,
  testRuns: { matrix: main.stats, ...(journeys ? { journeys: journeys.stats } : {}), parity: parity.stats },
  environments, audits, screenshots,
  method: "Production Astro output served by Wrangler's local Cloudflare runtime. Real Playwright browser screenshots, theme changes through the UI, real committed race data, axe WCAG 2 A/AA and 2.1 AA scans. No golden-image comparison or aesthetic scoring.",
  limitations: "WebKit is the browser engine used by Safari, not the branded Safari application. Mobile uses Playwright device emulation, not physical hardware. Axe reports incomplete checks separately and does not replace manual accessibility review. These captures establish rendering at the recorded source and viewport; visual appeal is a human judgment, not an irrefutable automated claim. This is local-runtime evidence, not verification of the public preview or production CDN.",
};
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ screenshots: screenshots.length, committed: screenshots.filter((s) => s.committed).length, source: report.applicationSourceSha256, testRuns: report.testRuns }, null, 2));
