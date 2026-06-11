import { test, expect } from "@playwright/test";

/**
 * Cold-path journey SLA gate.
 *
 * Measures the wall-clock time an end user experiences going from the home
 * page to an athlete's page, on a COLD / UNCACHED path, and fails if the
 * end-to-end total exceeds the budget below.
 *
 * Why this is shaped the way it is (see
 * docs/superpowers/specs/2026-06-10-journey-performance-test-design.md):
 *  - Runs only against a deployed BASE_URL. Vercel serverless cold start does
 *    not occur on `next dev`, so a local run would be a false green.
 *  - Picks a random athlete each run so the destination page is never
 *    edge-cached, forcing a real server render.
 *  - retries: 0, because a retry would hit a now-warm function and mask a
 *    cold failure.
 *
 * Run against a freshly-deployed preview (functions cold by construction):
 *   BASE_URL=https://<preview-url> npx playwright test journey-performance
 */

const TOTAL_BUDGET_MS = 2_500;

// Common surnames that reliably return results from the athlete index.
const SURNAMES = [
  "smith",
  "miller",
  "garcia",
  "johnson",
  "brown",
  "jones",
  "williams",
  "lee",
  "martin",
  "anderson",
];

const baseURL = process.env.BASE_URL ?? "";
const isRemote = /^https?:\/\//.test(baseURL) && !/localhost|127\.0\.0\.1/.test(baseURL);

test.describe("home → search → athlete journey (cold path)", () => {
  // A retry would warm the function and hide a cold-path regression.
  test.describe.configure({ retries: 0 });

  test.skip(
    !isRemote,
    "Set BASE_URL to a deployed (non-localhost) URL — cold start cannot be measured against `next dev`.",
  );

  test(`completes in under ${TOTAL_BUDGET_MS}ms`, async ({ page }) => {
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const timings: Record<string, number> = {};

    // Step 1: home page load.
    let start = Date.now();
    await page.goto("/", { waitUntil: "load" });
    timings.homepage = Date.now() - start;

    // Step 2: type a surname, wait for the results dropdown.
    const searchInput = page.getByPlaceholder("Search athlete name...");
    await expect(searchInput).toBeVisible();

    start = Date.now();
    await searchInput.fill(surname);

    // The dropdown renders <a href="/athlete/..."> links, one per match.
    const resultLinks = page.locator('a[href^="/athlete/"]');
    await expect(resultLinks.first()).toBeVisible({ timeout: 20_000 });
    timings.search = Date.now() - start;

    // Pick a random match so the destination page is unlikely to be cached.
    const count = await resultLinks.count();
    const resultLink = resultLinks.nth(Math.floor(Math.random() * count));

    // Capture the athlete's name so we can confirm their page rendered.
    const athleteName = (await resultLink.locator("div").first().innerText()).trim();

    // Step 3: click the result, wait for the athlete page to render.
    start = Date.now();
    await resultLink.click();
    await page.waitForURL(/\/athlete\//, { timeout: 25_000 });
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(escapeRegExp(athleteName)) }),
    ).toBeVisible({ timeout: 25_000 });
    timings.athletePage = Date.now() - start;

    const total = timings.homepage + timings.search + timings.athletePage;

    const breakdown =
      `\n=== Cold-path journey (surname="${surname}", athlete="${athleteName}") ===\n` +
      `  Homepage load:     ${timings.homepage}ms\n` +
      `  Search results:    ${timings.search}ms\n` +
      `  Athlete page load: ${timings.athletePage}ms\n` +
      `  Total:             ${total}ms (budget: ${TOTAL_BUDGET_MS}ms)\n` +
      `==========================================================\n`;
    console.log(breakdown);

    expect(total, breakdown).toBeLessThan(TOTAL_BUDGET_MS);
  });
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
