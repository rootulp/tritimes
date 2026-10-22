// Independent Lighthouse mobile audits. Keep the full HTML/JSON reports.
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const base = process.env.STATIC_URL ?? "http://127.0.0.1:8787";
const runs = Number(process.env.PERF_RUNS ?? 3);
if (!Number.isInteger(runs) || runs < 3) throw new Error("Use at least three Lighthouse runs");
const pages = [
  ["home", "/"], ["races", "/races"],
  ["race", "/race/im703-oceanside-2025"],
  ["result", "/race/im-arizona-2025/result/0"],
  ["athlete", "/athlete/rootul-patel--us-m"],
  ["course", "/courses/im703-swansea"],
];
// Include the largest generated HTML file, so the audits also cover a heavy
// multi-edition page rather than only representative small examples.
if (fs.existsSync("artifacts/assets.json")) {
  const largest = JSON.parse(fs.readFileSync("artifacts/assets.json", "utf8")).largest.file;
  if (largest.endsWith(".html")) {
    const path = "/" + largest.replace(/^dist\//, "").replace(/\.html$/, "").replace(/^index$/, "");
    if (!pages.some(([, existing]) => existing === path)) pages.push(["largest-html", path]);
  }
}
fs.mkdirSync("artifacts/lighthouse", { recursive: true });
const summary = [];
for (const [name, path] of pages) {
  for (let run = 1; run <= runs; run++) {
    // A fresh Chromium process per audit also isolates browser caches.
    const chrome = await launch({
      chromePath: process.env.CHROMIUM_PATH,
      chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const result = await lighthouse(base + path, {
        port: chrome.port, output: ["json", "html"],
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        logLevel: "error",
      });
      if (!result || result.lhr.runtimeError) throw new Error(JSON.stringify(result?.lhr.runtimeError));
      const { lhr } = result;
      fs.writeFileSync(`artifacts/lighthouse/${name}-${run}.json`, result.report[0]);
      fs.writeFileSync(`artifacts/lighthouse/${name}-${run}.html`, result.report[1]);
      const sample = {
        page: path, run, lighthouseVersion: lhr.lighthouseVersion,
        scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, value]) => [key, value.score])),
        lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
        fcpMs: lhr.audits["first-contentful-paint"].numericValue,
        cls: lhr.audits["cumulative-layout-shift"].numericValue,
        tbtMs: lhr.audits["total-blocking-time"].numericValue,
        warnings: lhr.runWarnings,
      };
      summary.push(sample);
      console.log(`${path} #${run}: performance ${sample.scores.performance}, LCP ${Math.round(sample.lcpMs)}ms`);
    } finally {
      await chrome.kill();
    }
  }
}
fs.writeFileSync("artifacts/lighthouse/summary.json", JSON.stringify({
  generatedAt: new Date().toISOString(), base, runs,
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  conditions: "Lighthouse 12.6.1 default mobile simulated Slow 4G and 4x CPU slowdown; fresh Chrome process per run",
  samples: summary,
}, null, 2) + "\n");
