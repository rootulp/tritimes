import { test, expect } from "@playwright/test";

test("races page filters by distance, year, and text, and mirrors them in the URL", async ({ page }) => {
  await page.goto("/races");
  const count = page.locator("#race-count");
  const total = Number(await count.innerText());
  expect(total).toBeGreaterThan(1000);

  await page.getByRole("button", { name: "140.6", exact: true }).click();
  const full = Number(await count.innerText());
  expect(full).toBeLessThan(total);
  await expect(page.locator("#race-grid > a:visible").first()).toContainText("140.6");

  await page.locator("#race-year").selectOption("2024");
  await page.locator("#race-search").fill("wisconsin");
  await expect(count).toHaveText("1");
  await expect(page.locator("#race-grid > a:visible")).toHaveText(/2024 IRONMAN Wisconsin/);
  expect(new URL(page.url()).search).toBe("?distance=140.6&year=2024&q=wisconsin");

  // A shared link opens pre-filtered.
  await page.goto("/races?distance=140.6&year=2024&q=wisconsin");
  await expect(count).toHaveText("1");

  await page.locator("#race-search").fill("zzzz-no-match");
  await expect(page.getByText("No races match your filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(count).toHaveText(String(total));
  expect(new URL(page.url()).search).toBe("");
});

test("race page distributions filter by gender and age group", async ({ page }) => {
  await page.goto("/race/im703-oceanside-2025");
  await page.locator("#race-dist-gender").selectOption({ label: "Female" });
  await expect(page.getByText(/^504 of 2,424 finishers$/)).toBeVisible();
  await page.locator("#race-dist-age-group").selectOption({ label: "30-34" });
  await expect(page.getByText(/^\d+ of 2,424 finishers$/)).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText(/of 2,424 finishers$/)).toHaveCount(0);
});

test("combined course page distributions load the pooled data", async ({ page }) => {
  await page.goto("/courses/im703-swansea");
  await expect(page.getByRole("heading", { name: "Fastest Finishers (All Editions)" })).toBeVisible();
  await page.locator("#race-dist-gender").selectOption({ label: "Male" });
  await expect(page.getByText(/^[\d,]+ of [\d,]+ finishers$/)).toBeVisible();
});

test("switching course year tags does not pile up browser history", async ({ page }) => {
  const course = "im703-oceanside";
  await page.goto("/courses");
  await page.locator(`a[href="/courses/${course}"]`).first().click();
  await page.waitForURL(`/courses/${course}`);
  for (const year of ["2025", "2024", "2023"]) {
    await page.locator(`a[href="/courses/${course}/${year}"]`).click();
    await page.waitForURL(`/courses/${course}/${year}`);
  }
  await page.goBack();
  await page.waitForURL(/\/courses$/);
});

test("legacy ?year= course links redirect to the year page", async ({ page }) => {
  await page.goto("/courses/im703-swansea?year=2024");
  await page.waitForURL("/courses/im703-swansea/2024");
  await expect(page.getByRole("heading", { name: "IRONMAN 70.3 Swansea 2024" })).toBeVisible();
});

test("unknown pages, courses, and course years return a real 404", async ({ page, request }) => {
  for (const url of ["/no-such-page", "/race/no-such-race", "/courses/no-such-course-xyz", "/courses/im703-swansea/1999"]) {
    expect((await request.get(url)).status(), url).toBe(404);
  }
  await page.goto("/courses/im703-swansea?year=1999");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("existing pages return 200", async ({ request }) => {
  for (const url of ["/", "/races", "/courses", "/courses/im703-swansea", "/race/im-arizona-2025", "/stats", "/faq", "/stats/average-ironman-time", "/sitemap.xml", "/robots.txt"]) {
    expect((await request.get(url)).status(), url).toBe(200);
  }
});

test("mobile menu opens, closes on Escape, and links to the nav pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  const menu = page.locator("[data-mobile-menu]");
  await expect(menu.getByRole("link", { name: "Courses" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await menu.getByRole("link", { name: "Stats" }).click();
  await page.waitForURL("/stats");
});
