import { test, expect } from "@playwright/test";

test("search for athlete and navigate to profile", async ({ page }) => {
  const timings: Record<string, number> = {};
  let start = Date.now();

  // Step 1: Navigate to homepage
  await page.goto("/");
  timings["page_load"] = Date.now() - start;

  // Step 2: Type athlete name into search
  const searchInput = page.getByPlaceholder("Search athlete name...");
  await expect(searchInput).toBeVisible();

  start = Date.now();
  await searchInput.fill("Rootul Patel");

  // Step 3: Wait for search results to appear
  const resultLink = page.getByRole("link", { name: /Rootul Patel/ });
  await expect(resultLink).toBeVisible({ timeout: 15_000 });
  timings["search_results"] = Date.now() - start;

  // Step 4: Click the search result
  start = Date.now();
  await resultLink.click();

  // Step 5: Wait for athlete page to load
  await page.waitForURL(/\/athlete\//, { timeout: 15_000 });
  await expect(page.getByText("Rootul Patel")).toBeVisible();
  timings["athlete_page_load"] = Date.now() - start;

  // Print timing summary
  const total =
    timings["page_load"] + timings["search_results"] + timings["athlete_page_load"];
  console.log("\n=== Athlete Search Timing ===");
  console.log(`  Homepage load:     ${timings["page_load"]}ms`);
  console.log(`  Search results:    ${timings["search_results"]}ms`);
  console.log(`  Athlete page load: ${timings["athlete_page_load"]}ms`);
  console.log(`  Total:             ${total}ms`);
  console.log("=============================\n");
});
