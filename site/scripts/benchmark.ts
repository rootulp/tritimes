/** Repeatable browser lab comparison. See docs/migration.md for limitations. */
import { chromium, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const runs = Number(process.env.PERF_RUNS ?? 5);
assert(Number.isInteger(runs) && runs >= 3, "Use at least three independent runs");
const targets = [
  { name: "static", url: process.env.STATIC_URL ?? "http://127.0.0.1:8787" },
  ...(process.env.BASELINE_URL ? [{ name: "next", url: process.env.BASELINE_URL }] : []),
];
const routes = [
  ["home", "/", "h1"],
  ["races", "/races", "h1"],
  ["courses", "/courses", "h1"],
  ["course", "/courses/im703-swansea", "h1"],
  ["race", "/race/im703-oceanside-2025", "h1"],
  // The second selector is the unchanged Next.js baseline used by BASELINE_URL.
  ["result", "/race/im-arizona-2025/result/0", ".percentile-pill, .bg-amber-400\\/15"],
  ["athlete", "/athlete/rootul-patel--us-m", 'button[aria-label^="Hide "]'],
  ["stats", "/stats", "h1"],
  ["faq", "/faq", "h1"],
] as const;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const samples: Record<string, unknown>[] = [];
fs.mkdirSync("artifacts/performance", { recursive: true });

async function observe(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { lab: { lcp: number; shifts: { time: number; value: number }[] } };
    w.lab = { lcp: 0, shifts: [] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.lab.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!e.hadRecentInput) w.lab.shifts.push({ time: e.startTime, value: e.value });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

try {
  // Interleave implementations each round to reduce drift and order bias.
  for (let run = 0; run < runs; run++) {
    for (const [name, route, ready] of routes) {
      for (const target of run % 2 ? [...targets].reverse() : targets) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750,
        });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        let transferBytes = 0;
        cdp.on("Network.loadingFinished", (e) => { transferBytes += e.encodedDataLength; });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await observe(page);
        const response = await page.goto(target.url + route, { waitUntil: "domcontentloaded", timeout: 60_000 });
        assert.equal(response?.status(), 200, `${target.name}${route} HTTP status`);
        await page.locator(ready).first().waitFor({ state: "visible", timeout: 45_000 });
        const readyMs = await page.evaluate(() => performance.now());
        // Let delayed paints and non-input layout shifts settle before freezing metrics.
        await page.waitForTimeout(1500);
        const metrics = await page.evaluate(() => {
          const w = window as unknown as { lab: { lcp: number; shifts: { time: number; value: number }[] } };
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
          let cls = 0, score = 0, start = 0, previous = -Infinity;
          for (const shift of w.lab.shifts) {
            if (shift.time - previous > 1000 || shift.time - start > 5000) {
              score = 0; start = shift.time;
            }
            score += shift.value; cls = Math.max(cls, score); previous = shift.time;
          }
          return {
            ttfbMs: nav.responseStart - nav.requestStart,
            fcpMs: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null,
            lcpMs: w.lab.lcp || null, cls,
            jsBytes: performance.getEntriesByType("resource").filter((e) => e.name.match(/\.m?js(?:\?|$)/))
              .reduce((sum, e) => sum + (e as PerformanceResourceTiming).encodedBodySize, 0),
          };
        });
        assert(metrics.lcpMs && metrics.fcpMs, `${target.name}${route}: missing paint metrics`);
        assert.deepEqual(errors, [], `${target.name}${route}: browser exceptions`);
        if (run === 0) await page.screenshot({ path: `artifacts/performance/${target.name}-${name}.png`, fullPage: true });
        samples.push({ target: target.name, run: run + 1, route, ...metrics, readyMs, transferBytes });
        console.log(`${target.name} ${route} #${run + 1}: LCP ${Math.round(metrics.lcpMs)}ms; ready ${Math.round(readyMs)}ms; CLS ${metrics.cls.toFixed(3)}`);
        await context.close();
      }
    }
  }
  // Separate cold-browser journey: readiness includes the actual athlete content.
  const journeys: Record<string, unknown>[] = [];
  for (const target of targets) {
    for (const query of ["Rootul Patel", "Mark Smith", "Maria Garcia"]) {
    for (let run = 0; run < runs; run++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const start = performance.now();
      await page.goto(target.url, { waitUntil: "load" });
      const homeMs = performance.now() - start;
      const searchStart = performance.now();
      await page.getByPlaceholder("Search athlete name...").fill(query);
      const result = page.locator('a[href^="/athlete/"]').first();
      await result.waitFor({ state: "visible", timeout: 30_000 });
      const href = await result.getAttribute("href");
      assert(href, "Search match has a destination");
      const searchMs = performance.now() - searchStart;
      const athleteStart = performance.now();
      await result.click();
      await page.waitForURL(new URL(href, target.url).href);
      await page.locator('button[aria-label^="Hide "]').first().waitFor({ state: "visible", timeout: 30_000 });
      const athleteMs = performance.now() - athleteStart;
      const totalMs = performance.now() - start;
      journeys.push({ target: target.name, query, destination: href, run: run + 1, homeMs, searchMs, athleteMs, totalMs });
      console.log(`${target.name} journey ${query} #${run + 1}: ${Math.round(totalMs)}ms (search ${Math.round(searchMs)}ms)`);
      await context.close();
    }
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    browser: browser.version(), node: process.version, cpu: os.cpus()[0].model,
    conditions: { viewport: "390x844", latencyMs: 150, downloadBytesPerSecond: 200_000, uploadBytesPerSecond: 93_750, cpuSlowdown: 4, browserCache: "disabled; fresh context per navigation", runs },
    targets, samples, journeys,
    limitations: "Synthetic local lab measurements, not field Core Web Vitals. Fresh browser caches do not imply cold CDN caches or cold serverless functions. CPU slowdown is relative to this host. Ready times include browser automation overhead. LCP sampled before subsequent interaction. No real-user INP claim.",
  };
  fs.writeFileSync("artifacts/performance/browser.json", JSON.stringify(report, null, 2) + "\n");
} finally {
  await browser.close();
}
