import { test, expect } from "@playwright/test";

// Rootul Patel is in the committed data (13+ results across 2019–2026).
const ATHLETE = "rootul-patel--us-m";

test("home search finds an athlete and opens their profile", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Search athlete name...").fill("Rootul Patel");
  const result = page.getByRole("option", { name: /Rootul Patel/ });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.click();
  await page.waitForURL(`/athlete/${ATHLETE}`);
  await expect(page.getByRole("heading", { name: /Rootul Patel/ })).toBeVisible();
  await expect(page).toHaveTitle("Rootul Patel — Triathlon Race History | TriTimes");
});

test("command palette opens with Ctrl+K and Enter navigates to the top match", async ({ page }) => {
  await page.goto("/races");
  await page.keyboard.press("Control+k");
  const input = page.getByRole("dialog", { name: "Search athletes" }).getByPlaceholder("Search athlete name...");
  await expect(input).toBeFocused();
  await input.fill("rootul pat");
  // The "ro" prefix shard is one of the largest (~0.5 MB), so allow it time to load.
  await expect(page.getByRole("option", { name: /Rootul Patel/ })).toBeVisible({ timeout: 15_000 });
  await input.press("Enter");
  await page.waitForURL(`/athlete/${ATHLETE}`);
});

test("athlete page: hiding a race persists across reloads and drops it from the CSV", async ({ page }) => {
  await page.goto(`/athlete/${ATHLETE}`);
  const hide = page.getByRole("button", { name: /^Hide .* from charts$/ }).first();
  const raceName = (await hide.getAttribute("aria-label"))!.replace(/^Hide | from charts$/g, "");
  await hide.click();
  await expect(page.getByText("1 result hidden from charts")).toBeVisible();

  await page.reload();
  await expect(page.getByText("1 result hidden from charts")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("rootul-patel-results.csv");
  const csv = await (await file.createReadStream()).toArray();
  const text = Buffer.concat(csv).toString();
  expect(text.split("\n")[0]).toBe("Race,Date,Distance,Age Group,Swim,Bike,Run,Finish,Percentile");
  expect(text).not.toContain(raceName);
});

test("result page: cards, percentile pills, and the age group / overall toggle", async ({ page }) => {
  // Navigate from the race leaderboard so the test doesn't hardcode a result id.
  await page.goto("/race/im-arizona-2025");
  await page.locator('a[href^="/race/im-arizona-2025/result/"]').first().click();
  await page.waitForURL(/\/race\/im-arizona-2025\/result\/\d+$/);

  await expect(page.getByText("Overall", { exact: true }).first()).toBeVisible();
  const pills = page.locator(".percentile-pill");
  await expect(pills).toHaveCount(4);
  await expect(pills.first().locator(".sr-only")).toHaveText(/of age group$/);
  await expect(page.getByText(/^Age Group: /).first()).toBeVisible();

  await page.getByRole("button", { name: "Overall Field" }).click();
  await expect(pills.first().locator(".sr-only")).toHaveText(/of overall field$/);
  await expect(page.getByText("Overall Field", { exact: true }).nth(1)).toBeVisible();
  await expect(page).toHaveTitle(/ — 2025 IRONMAN Arizona Result \| TriTimes$/);
});

test("result page: share copies the canonical link and downloads a PNG card", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/race/im-arizona-2025");
  await page.locator('a[href^="/race/im-arizona-2025/result/"]').first().click();
  await page.waitForURL(/\/result\/\d+$/);

  await page.getByRole("button", { name: /Share/ }).click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`https://tritimes.org${new URL(page.url()).pathname}`);

  await page.getByRole("button", { name: /Share/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download image" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/-im-arizona-2025\.png$/);
  const bytes = Buffer.concat(await (await file.createReadStream()).toArray());
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(1200); // width
  expect(bytes.readUInt32BE(20)).toBe(630); // height
});

test("unknown result and athlete URLs show the not-found page and are noindexed", async ({ page }) => {
  for (const url of [
    "/race/im-arizona-2025/result/99999999",
    "/race/no-such-race/result/1",
    "/athlete/no-such-person--zz-x",
    "/athlete/__proto__",
    "/athlete/constructor",
    "/athlete/toString",
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1);
    await expect(page).toHaveTitle("Page not found | TriTimes");
  }
});
