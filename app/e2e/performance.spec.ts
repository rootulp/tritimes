import { test, expect } from "@playwright/test";

const pages = [
  { name: "Home", path: "/" },
  { name: "Races", path: "/races" },
  { name: "Race", path: "/race/im703-colombo-2026" },
  { name: "Result", path: "/race/im703-colombo-2026/result/1" },
];

for (const { name, path } of pages) {
  test(`${name} page (${path}) loads with acceptable Web Vitals`, async ({
    page,
  }) => {
    // Inject web-vitals collection before navigating
    const vitals: Record<string, number> = {};

    await page.addInitScript(() => {
      // Collect paint entries via PerformanceObserver
      (window as unknown as Record<string, unknown>).__vitals = {};
      const w = window as unknown as Record<string, Record<string, number>>;

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            w.__vitals.FCP = entry.startTime;
          }
        }
      }).observe({ type: "paint", buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          w.__vitals.LCP = entry.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });

      new PerformanceObserver((list) => {
        let cls = 0;
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!layoutShift.hadRecentInput) {
            cls += layoutShift.value;
          }
        }
        w.__vitals.CLS = cls;
      }).observe({ type: "layout-shift", buffered: true });
    });

    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status()).toBeLessThan(400);

    // Wait for metrics to settle
    await page.waitForTimeout(1000);

    // Collect TTFB from navigation timing
    const ttfb = await page.evaluate(() => {
      const nav = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      return nav.responseStart - nav.requestStart;
    });

    // Collect paint and layout metrics
    const collected = await page.evaluate(() => {
      return (
        window as unknown as Record<string, Record<string, number>>
      ).__vitals;
    });

    Object.assign(vitals, collected, { TTFB: ttfb });

    console.log(`\n📊 Web Vitals for ${name} (${path}):`);
    console.log(`  FCP:  ${vitals.FCP?.toFixed(0) ?? "N/A"}ms (target: <1800ms)`);
    console.log(`  LCP:  ${vitals.LCP?.toFixed(0) ?? "N/A"}ms (target: <2500ms)`);
    console.log(`  CLS:  ${vitals.CLS?.toFixed(3) ?? "N/A"} (target: <0.1)`);
    console.log(`  TTFB: ${vitals.TTFB?.toFixed(0) ?? "N/A"}ms (target: <800ms)`);

    // Assert reasonable thresholds (generous for local dev)
    if (vitals.FCP) expect(vitals.FCP).toBeLessThan(3000);
    if (vitals.LCP) expect(vitals.LCP).toBeLessThan(5000);
    if (vitals.CLS !== undefined) expect(vitals.CLS).toBeLessThan(0.25);
    if (vitals.TTFB) expect(vitals.TTFB).toBeLessThan(2000);
  });
}
