import { test, expect } from "@playwright/test";
import { gunzipSync } from "node:zlib";

test("race, course, article and FAQ content is present without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  for (const [url, heading] of [
    ["/race/im-arizona-2025", "Discipline Breakdown"],
    ["/courses/im703-swansea", "All Editions"],
    ["/stats/average-ironman-time", "Average"],
    ["/faq", "Frequently Asked Questions"],
  ]) {
    expect((await page.goto(url))?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: new RegExp(heading) }).first()).toBeVisible();
  }
  await context.close();
});

test("static data ships as readable raw gzip with explicit cache policy", async ({ request }) => {
  const res = await request.get("/data/race/im-arizona-2025.json.gz");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/gzip");
  expect(res.headers()["cache-control"]).toContain("max-age=300");
  const bytes = await res.body();
  expect([...bytes.subarray(0, 2)]).toEqual([0x1f, 0x8b]);
  const file = JSON.parse(gunzipSync(bytes).toString());
  expect(file.names[0]).toBe("Menno Koolhaas");
});

test("shell preloads reuse each data request exactly once", async ({ page }) => {
  for (const url of ["/athlete/rootul-patel--us-m", "/race/im-arizona-2025/result/0"]) {
    const requests: string[] = [];
    const listener = (request: { url(): string }) => {
      if (request.url().includes("/data/")) requests.push(request.url());
    };
    page.on("request", listener);
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Rootul Patel|Menno Koolhaas/);
    expect(requests.length).toBe(url.startsWith("/athlete/") ? 2 : 1);
    expect(new Set(requests).size).toBe(requests.length);
    page.off("request", listener);
  }
});

test("data failures offer recovery and malformed athlete URLs do not crash", async ({ page }) => {
  await page.route("**/data/athlete/*.json.gz", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/athlete/rootul-patel--us-m");
  await expect(page.getByText(/Couldn't load this athlete/)).toBeVisible();
  await page.unrouteAll();
  await page.getByRole("button", { name: "try again" }).click();
  await expect(page.getByRole("heading", { name: /Rootul Patel/ })).toBeVisible();
  await page.goto("/athlete/%E0%A4%A");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("search distinguishes a failed download from no matches and can retry", async ({ page }) => {
  await page.route("**/search-shards/*", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  await page.getByPlaceholder("Search athlete name...").fill("Rootul Patel");
  await expect(page.getByRole("alert")).toContainText("Couldn't load search results");
  await page.unrouteAll();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("link", { name: /Rootul Patel/ })).toBeVisible();
});
