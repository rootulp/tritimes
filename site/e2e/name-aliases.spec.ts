import { test, expect } from "@playwright/test";

for (const { query, name, slug } of [
  { query: "alex ogura", name: "Alexander Ogura", slug: "alexander-ogura--us-m" },
  { query: "tom edwards", name: "Thomas Edwards", slug: "thomas-edwards--us-m" },
]) {
  test(`given-name alias: ${query} opens ${slug}`, async ({ page }, testInfo) => {
    const searchRequests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/search-shards/")) searchRequests.push(new URL(request.url()).pathname);
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const start = Date.now();
    await page.getByPlaceholder("Search athlete name...").fill(query);
    const result = page.locator(`a[href="/athlete/${slug}"]`);
    await expect(result).toBeVisible();
    await expect(result).toContainText(name);
    const resultMs = Date.now() - start;
    // Real generated data, no intercepted responses or fixture substitution.
    // A nickname must use one partition, not download several shards.
    expect(searchRequests).toHaveLength(1);
    await testInfo.attach("search-result", { body: await page.screenshot(), contentType: "image/png" });
    await result.click();
    await page.waitForURL(`/athlete/${slug}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page).toHaveTitle(`${name} — Triathlon Race History | TriTimes`);
    expect(errors).toEqual([]);
    await testInfo.attach("athlete-profile", { body: await page.screenshot(), contentType: "image/png" });
    await testInfo.attach("search-evidence", {
      body: JSON.stringify({ query, name, expectedPath: `/athlete/${slug}`, finalURL: page.url(), resultMs, searchRequests, errors }, null, 2),
      contentType: "application/json",
    });
  });
}
