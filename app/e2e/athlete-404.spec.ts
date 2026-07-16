import { test, expect } from "@playwright/test";

// Regression guard for the athlete-page soft-404. A loading.tsx at
// app/src/app/athlete/[slug]/ created an implicit Suspense boundary that made
// Next stream the shell with a 200 status before the page's notFound() ran, so
// a nonexistent athlete returned HTTP 200 with the not-found UI (a soft 404 —
// bad for SEO). Removing that loading.tsx lets Next resolve notFound() before
// flushing the status. These assertions fail (miss returns 200) if it comes back.

test("nonexistent athlete returns a real 404 status", async ({ page }) => {
  const res = await page.goto("/athlete/no-such-person--zz-x");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("existing athlete returns 200 and renders the profile", async ({ page }) => {
  // Rootul Patel is present in the committed athlete index (see
  // athlete-search.spec.ts, which relies on the same athlete).
  const res = await page.goto("/athlete/rootul-patel--us-m");
  expect(res?.status()).toBe(200);
  await expect(page.getByText("Rootul Patel")).toBeVisible();
});
