import { test, expect } from "@playwright/test";

test("loading an athlete keeps the footer below the viewport and avoids layout shift", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/data/athlete/*.json.gz", async (route) => {
    await pending;
    await route.continue();
  });
  await page.addInitScript(() => {
    const measured = window as unknown as Window & { athleteLayoutShifts: number[] };
    measured.athleteLayoutShifts = [];
    new PerformanceObserver((list) => {
      for (const raw of list.getEntries()) {
        const entry = raw as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!entry.hadRecentInput) measured.athleteLayoutShifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  try {
    await page.goto("/athlete/rootul-patel--us-m", { waitUntil: "domcontentloaded" });
    await expect(page.locator('main[aria-busy="true"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const footer = await page.locator("footer").boundingBox();
    expect(footer).not.toBeNull();
    expect(footer!.y).toBeGreaterThanOrEqual(page.viewportSize()!.height);
    release();
    await expect(page.getByRole("heading", { name: /Rootul Patel/ })).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    const cls = await page.evaluate(() => (window as unknown as Window & { athleteLayoutShifts: number[] })
      .athleteLayoutShifts.reduce((sum, value) => sum + value, 0));
    expect(cls).toBeLessThanOrEqual(0.1);
  } finally { release(); }
});
