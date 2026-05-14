import { test, expect } from "@playwright/test";

// We don't hardcode a specific result ID — instead navigate from the race page,
// which insulates the test from data changes.
const RACE_SLUG = "im-arizona-2005";

test("result page shows AG percentile pills on each discipline card", async ({ page }) => {
  // Visit the race page and click the first result link in the leaderboard.
  await page.goto(`/race/${RACE_SLUG}`);
  const firstResult = page.getByRole("link", { name: /^\d/ }).first();
  // Fallback: grab any result link visible on the race page.
  const resultLink = (await firstResult.count())
    ? firstResult
    : page.locator(`a[href^="/race/${RACE_SLUG}/result/"]`).first();
  await resultLink.click();
  await page.waitForURL(new RegExp(`/race/${RACE_SLUG}/result/\\d+`));

  // Each of the four discipline cards should have an amber percentile pill.
  // Pills render either "<N>%" or "—".
  const pills = page.locator(".bg-amber-400\\/15");
  await expect(pills).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const text = (await pills.nth(i).innerText()).trim();
    expect(text).toMatch(/^(—|\d{1,3}%)$/);
  }
});

test("share dialog opens and copies link to clipboard", async ({ page, context }) => {
  // Allow clipboard read/write so the test can verify the copied value.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto(`/race/${RACE_SLUG}`);
  const resultLink = page.locator(`a[href^="/race/${RACE_SLUG}/result/"]`).first();
  await resultLink.click();
  await page.waitForURL(new RegExp(`/race/${RACE_SLUG}/result/\\d+`));

  // Open the share dialog
  const shareButton = page.getByRole("button", { name: /Share/i });
  await shareButton.click();
  const dialog = page.getByRole("dialog", { name: /Share this result/i });
  await expect(dialog).toBeVisible();

  // Click "Copy link"
  await page.getByRole("button", { name: /Copy link/i }).click();
  await expect(page.getByText("Link copied")).toBeVisible();

  // Verify clipboard contents match the canonical share URL
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toMatch(/^https:\/\/tritimes\.org\/race\/.+\/result\/\d+$/);

  // Dialog should be closed after the action
  await expect(dialog).toBeHidden();
});

test("share dialog closes on Escape", async ({ page }) => {
  await page.goto(`/race/${RACE_SLUG}`);
  const resultLink = page.locator(`a[href^="/race/${RACE_SLUG}/result/"]`).first();
  await resultLink.click();
  await page.waitForURL(new RegExp(`/race/${RACE_SLUG}/result/\\d+`));

  await page.getByRole("button", { name: /Share/i }).click();
  const dialog = page.getByRole("dialog", { name: /Share this result/i });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("OG image route returns a PNG", async ({ page, request }) => {
  // Pick a real result ID by navigating first.
  await page.goto(`/race/${RACE_SLUG}`);
  const href = await page
    .locator(`a[href^="/race/${RACE_SLUG}/result/"]`)
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();

  const response = await request.get(`${href}/opengraph-image`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const body = await response.body();
  expect(body.length).toBeGreaterThan(5_000); // sanity: not an empty PNG
});

test("result page exposes og:image meta tag", async ({ page }) => {
  await page.goto(`/race/${RACE_SLUG}`);
  const href = await page
    .locator(`a[href^="/race/${RACE_SLUG}/result/"]`)
    .first()
    .getAttribute("href");
  await page.goto(href!);

  const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(ogImage).toBeTruthy();
  expect(ogImage).toMatch(/opengraph-image/);
});
