/** Cold-browser comparison against two real production builds. Run from site/:
 * BEFORE_URL=http://127.0.0.1:8788 AFTER_URL=http://127.0.0.1:8787 \
 * CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/verify-name-aliases.ts
 */
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";

const targets = [
  { version: "before", url: process.env.BEFORE_URL },
  { version: "after", url: process.env.AFTER_URL },
];
assert(targets.every((target) => target.url), "Set BEFORE_URL and AFTER_URL to the two production builds");
const runs = Number(process.env.PERF_RUNS ?? 5);
assert(Number.isInteger(runs) && runs >= 3, "Use at least three independent runs");
const queries = [
  { query: "alex ogura", slug: "alexander-ogura--us-m", alias: true },
  { query: "tom edwards", slug: "thomas-edwards--us-m", alias: true },
  { query: "rootul patel", slug: "rootul-patel--us-m" },
  { query: "thomas edwards", slug: "thomas-edwards--us-m" },
  { query: "tom" },
  { query: "to" },
];
const directory = "artifacts/name-aliases";
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const samples: { version: string; query: string; resultMs: number; found: boolean | null; links: string[]; requests: string[]; gzipBytes: number; errors: string[] }[] = [];
try {
  for (let run = 0; run < runs; run++) {
    for (const { query, slug, alias } of queries) {
      for (const target of run % 2 ? [...targets].reverse() : targets) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        const errors: string[] = [];
        const requests: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => {
          if (request.url().includes("/search-shards/")) requests.push(new URL(request.url()).pathname);
        });
        assert.equal((await page.goto(target.url!))?.status(), 200);
        // Exclude page hydration from input-to-results timing.
        await page.waitForFunction(() => !document.querySelector('#global-search')?.closest('astro-island')?.hasAttribute('ssr'));
        const input = page.getByPlaceholder("Search athlete name...");
        const dropdown = input.locator("../..").locator("ul");
        const start = performance.now();
        await input.fill(query);
        await expect(dropdown).toBeVisible();
        await expect(dropdown).not.toContainText("Searching athletes...", { timeout: 15_000 });
        const resultMs = performance.now() - start;
        const links = await dropdown.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
        const found = slug ? links.includes(`/athlete/${slug}`) : null;
        if (slug) assert.equal(found, target.version === "after" || !alias, `${target.version}: ${query}`);
        if (target.version === "after") assert.equal(requests.length, 1, `${query} should load one partition`);
        assert.deepEqual(errors, []);
        const gzipBytes = await page.evaluate(() => performance.getEntriesByType("resource")
          .filter((entry) => entry.name.includes("/search-shards/"))
          .reduce((sum, entry) => sum + (entry as PerformanceResourceTiming).encodedBodySize, 0));
        if (run === 0 && alias) await page.screenshot({ path: `${directory}/${target.version}-${query.replaceAll(" ", "-")}.png` });
        samples.push({ version: target.version, query, resultMs, found, links, requests, gzipBytes, errors });
        await context.close();
      }
    }
  }
  const summary = targets.flatMap(({ version }) => queries.map(({ query }) => {
    const matching = samples.filter((sample) => sample.version === version && sample.query === query);
    const timings = matching.map((sample) => sample.resultMs).sort((a, b) => a - b);
    return { version, query, medianMs: timings[Math.floor(timings.length / 2)], maxMs: timings.at(-1), gzipBytes: matching[0].gzipBytes, requests: matching[0].requests };
  }));
  const report = { runs, browser: browser.version(), network: { latencyMs: 150, downloadBytesPerSecond: 200000 }, cpuSlowdown: 4, targets, summary, samples };
  fs.writeFileSync(`${directory}/browser.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
