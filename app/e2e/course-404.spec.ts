import { test, expect } from "@playwright/test";

// Regression guard for the course-page soft-404. A loading.tsx at
// app/src/app/courses/ created an implicit Suspense boundary that wrapped the
// [course] child segment, so Next streamed the shell with a 200 status before
// the page's notFound() ran — a nonexistent course (or an out-of-range
// ?year=) returned HTTP 200 with the not-found UI (a soft 404 — bad for SEO).
// The fix moves the /courses overview (page.tsx, loading.tsx, and its chart
// components) into a (overview) route group, so the loading boundary no
// longer wraps [course] and Next can resolve notFound() before flushing the
// status. These assertions fail (miss returns 200) if it comes back.

test("nonexistent course returns a real 404 status", async ({ page }) => {
  const res = await page.goto("/courses/no-such-course-xyz");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("out-of-range year on a real course returns a real 404 status", async ({ page }) => {
  const res = await page.goto("/courses/im703-swansea?year=1999");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("existing course returns 200 and renders the course page", async ({ page }) => {
  // im703-swansea is a real course (editions 2022-2026) in the committed data.
  const res = await page.goto("/courses/im703-swansea");
  expect(res?.status()).toBe(200);
  await expect(page.getByText("All years")).toBeVisible();
});
