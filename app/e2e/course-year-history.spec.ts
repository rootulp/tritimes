import { test, expect } from "@playwright/test";

// A course with many editions. Switching between year tags on a course page
// updates the URL (so a year is directly linkable) but should NOT stack a new
// browser-history entry per click — otherwise returning to the previous page
// requires as many Back clicks as years viewed.
const COURSE = "im703-oceanside";

test("switching year tags does not pile up browser history", async ({ page }) => {
  // Arrive at the course page from the courses overview so there is a real
  // previous page ("the race list") to return to.
  await page.goto("/courses");
  await page.locator(`a[href="/courses/${COURSE}"]`).first().click();
  await page.waitForURL(new RegExp(`/courses/${COURSE}$`));

  // Click through several year tags.
  for (const year of ["2025", "2024", "2023"]) {
    await page.locator(`a[href="/courses/${COURSE}?year=${year}"]`).click();
    await page.waitForURL(new RegExp(`/courses/${COURSE}\\?year=${year}$`));
  }

  // A single Back should return to the courses overview, not step through the
  // previously-viewed years.
  await page.goBack();
  await page.waitForURL(/\/courses$/);
  expect(new URL(page.url()).pathname).toBe("/courses");
});
