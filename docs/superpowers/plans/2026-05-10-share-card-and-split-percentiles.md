# Shareable Result Card + Split Percentile Pills — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add (1) an OG/share image route + in-page Share dialog with Copy link & Download image, and (2) age-group percentile pills on each discipline card of the result page.

**Architecture:** A Next.js file-route at `opengraph-image.tsx` produces the 1200×630 PNG via `next/og`'s `ImageResponse`, reusing `getDisciplineHistogram` from `lib/data.ts` for percentiles. A client `ShareDialog` component handles the button + popover. A pure `PercentilePill` component renders the small AG-percentile badge over each discipline card. All percentile data is already computed by the result page — no new data layer work.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, TypeScript, Vitest (pure-function tests), Playwright (component/route e2e). No new dependencies needed — `next/og` is bundled with Next.js.

**Spec:** [`docs/superpowers/specs/2026-05-10-share-card-and-split-percentiles-design.md`](../specs/2026-05-10-share-card-and-split-percentiles-design.md)

---

## File Structure

| File | New / Modified | Responsibility |
|---|---|---|
| `app/src/lib/percentile.ts` | New | Pure helper: format raw percentile number for display (handles 0 → "—") |
| `app/src/lib/__tests__/percentile.test.ts` | New | Unit tests for the helper |
| `app/src/components/PercentilePill.tsx` | New | Stateless: render a styled pill given a percentile number |
| `app/src/components/ShareDialog.tsx` | New | Client component: ghost button + popover with Copy link & Download image |
| `app/src/app/race/[slug]/result/[id]/opengraph-image.tsx` | New | Server route returning the 1200×630 PNG via `ImageResponse` |
| `app/src/app/race/[slug]/result/[id]/page.tsx` | Modified | Wire up `ShareDialog` in header; wrap each discipline card with `PercentilePill` |
| `app/e2e/result-share-and-pills.spec.ts` | New | E2E: pills are visible, share dialog opens & copies, OG image route returns PNG |

Conventions to follow (verified from existing code):
- TypeScript paths use the `@/` alias (e.g., `@/lib/data`).
- Components are PascalCase files exporting a default function.
- Tailwind v4 with utility classes; dark theme baseline (`bg-gray-900`, `text-white`, `border-gray-700`).
- Tests in `__tests__/` folders adjacent to source for vitest; Playwright tests in `app/e2e/`.
- Commit messages use Conventional Commits (`feat:`, `test:`, `refactor:`).

---

## Task 1: Percentile Display Helper (pure function)

A 0% percentile means "no data" in our histogram code (see `data.ts:541` — `0` is returned when `totalAthletes === 0`). The UI must render that as `—`, not `0%`.

**Files:**
- Create: `app/src/lib/percentile.ts`
- Test: `app/src/lib/__tests__/percentile.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `app/src/lib/__tests__/percentile.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatPercentile } from "../percentile";

describe("formatPercentile", () => {
  it("formats a normal percentile with a percent sign", () => {
    expect(formatPercentile(22)).toBe("22%");
    expect(formatPercentile(1)).toBe("1%");
    expect(formatPercentile(99)).toBe("99%");
    expect(formatPercentile(100)).toBe("100%");
  });

  it("renders an em-dash for 0 (treated as no data)", () => {
    expect(formatPercentile(0)).toBe("—");
  });

  it("renders an em-dash for negative or NaN", () => {
    expect(formatPercentile(-5)).toBe("—");
    expect(formatPercentile(Number.NaN)).toBe("—");
  });
});
```

- [ ] **Step 1.2: Run test, verify it fails**

Run: `cd app && npx vitest run src/lib/__tests__/percentile.test.ts`
Expected: FAIL — `Failed to resolve import "../percentile"`.

- [ ] **Step 1.3: Write the minimal implementation**

Create `app/src/lib/percentile.ts`:

```ts
/**
 * Format a raw percentile value (as returned by getDisciplineHistogram) for UI display.
 * A value of 0 is treated as "no data available" because getDisciplineHistogram returns 0
 * when the histogram is missing or empty — a true 0th-percentile finish is essentially
 * impossible (you'd have to be infinitely fast).
 */
export function formatPercentile(percentile: number): string {
  if (!Number.isFinite(percentile) || percentile <= 0) return "—";
  return `${percentile}%`;
}
```

- [ ] **Step 1.4: Run test, verify it passes**

Run: `cd app && npx vitest run src/lib/__tests__/percentile.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 1.5: Commit**

```bash
git add app/src/lib/percentile.ts app/src/lib/__tests__/percentile.test.ts
git commit -m "feat: add formatPercentile helper for display formatting"
```

---

## Task 2: PercentilePill Component

A small stateless component. No unit test — covered by the e2e test in Task 7. (The repo has no React Testing Library setup; introducing one for one component is YAGNI.)

**Files:**
- Create: `app/src/components/PercentilePill.tsx`

- [ ] **Step 2.1: Write the component**

Create `app/src/components/PercentilePill.tsx`:

```tsx
import { formatPercentile } from "@/lib/percentile";

interface PercentilePillProps {
  /** Raw percentile value (1-100); 0 means no data. */
  percentile: number;
  /** Optional aria-label override; defaults to "Age group top X%". */
  label?: string;
}

/**
 * Small amber pill showing the athlete's age-group percentile for a discipline.
 * Reference is implicit (age group) — page context conveys it.
 */
export default function PercentilePill({ percentile, label }: PercentilePillProps) {
  const text = formatPercentile(percentile);
  const ariaLabel = label ?? (text === "—" ? "Percentile unavailable" : `Age group top ${text}`);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/15 text-amber-400 tabular-nums"
      aria-label={ariaLabel}
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 2.2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 2.3: Commit**

```bash
git add app/src/components/PercentilePill.tsx
git commit -m "feat: add PercentilePill component for AG percentile display"
```

---

## Task 3: Integrate PercentilePill into Result Page Discipline Cards

The result page already computes `histograms[i].ageGroup.athletePercentile` for each discipline (page.tsx lines 59-63). We just consume it.

**Files:**
- Modify: `app/src/app/race/[slug]/result/[id]/page.tsx`

- [ ] **Step 3.1: Update the discipline cards block**

In `app/src/app/race/[slug]/result/[id]/page.tsx`, replace the block at lines 113-125:

```tsx
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {disciplines.map((d) => (
          <div
            key={d.key}
            className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center"
          >
            <div className="text-sm font-medium mb-1" style={{ color: DISCIPLINE_COLORS[d.label] || DEFAULT_DISCIPLINE_COLOR }}>
              {d.label}
            </div>
            <div className="text-lg font-mono font-bold text-white">{d.time}</div>
          </div>
        ))}
      </div>
```

with:

```tsx
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {histograms.map((d) => (
          <div
            key={d.key}
            className="relative bg-gray-900 rounded-lg border border-gray-700 p-4 text-center"
          >
            <div className="absolute top-2 right-2">
              <PercentilePill percentile={d.ageGroup.athletePercentile} />
            </div>
            <div className="text-sm font-medium mb-1" style={{ color: DISCIPLINE_COLORS[d.label] || DEFAULT_DISCIPLINE_COLOR }}>
              {d.label}
            </div>
            <div className="text-lg font-mono font-bold text-white">{d.time}</div>
          </div>
        ))}
      </div>
```

Two changes: iterate `histograms` (which has the percentile data) instead of `disciplines`, and add `relative` plus the absolutely-positioned pill.

- [ ] **Step 3.2: Add the import**

Near the top of the same file, add to the existing imports (after the `DISCIPLINE_COLORS` import on line 24):

```tsx
import PercentilePill from "@/components/PercentilePill";
```

- [ ] **Step 3.3: Run the dev server, verify visually**

Run: `cd app && npm run dev`

Visit `http://localhost:3000/race/im-arizona-2005/result/1` (or any valid result URL — use the first link from the leaderboard at `/race/im-arizona-2005`). Expected: each of the four discipline cards shows an amber pill in the top-right corner with a percentile or `—`.

Stop the dev server (Ctrl+C).

- [ ] **Step 3.4: TypeScript check**

Run: `cd app && npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 3.5: Lint check**

Run: `cd app && npm run lint`
Expected: PASS — no errors.

- [ ] **Step 3.6: Commit**

```bash
git add app/src/app/race/\[slug\]/result/\[id\]/page.tsx
git commit -m "feat: show AG percentile pill on each discipline card"
```

---

## Task 4: ShareDialog Component (button + popover)

Client component because it uses `navigator.clipboard` and outside-click handling.

**Files:**
- Create: `app/src/components/ShareDialog.tsx`

- [ ] **Step 4.1: Write the component**

Create `app/src/components/ShareDialog.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface ShareDialogProps {
  /** Public URL to share. Usually `window.location.href` at click time. */
  url: string;
  /** Path to the OG/share PNG endpoint, used as the download `href`. */
  imageHref: string;
  /** Suggested filename for downloaded image (no extension). */
  filename: string;
}

export default function ShareDialog({ url, imageHref, filename }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast("Copy failed — select the URL bar");
    }
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <span aria-hidden="true">↗</span>
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Share this result"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-700 bg-gray-900 p-1 shadow-lg z-10"
        >
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08]"
          >
            <span aria-hidden="true">🔗</span>
            Copy link
          </button>
          <a
            href={imageHref}
            download={`${filename}.png`}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08]"
          >
            <span aria-hidden="true">⬇</span>
            Download image
          </a>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-2 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4.2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 4.3: Commit**

```bash
git add app/src/components/ShareDialog.tsx
git commit -m "feat: add ShareDialog with Copy link and Download image actions"
```

---

## Task 5: Integrate ShareDialog into Result Page Header

**Files:**
- Modify: `app/src/app/race/[slug]/result/[id]/page.tsx`

- [ ] **Step 5.1: Add the import**

In `app/src/app/race/[slug]/result/[id]/page.tsx`, near the top of the file, add (after the `PercentilePill` import from Task 3):

```tsx
import ShareDialog from "@/components/ShareDialog";
```

- [ ] **Step 5.2: Compute the share URL and download filename**

Inside the `ResultPage` function, after the `const location = ...` line (around line 80), add:

```tsx
  const shareUrl = `https://tritimes.org/race/${slug}/result/${id}`;
  const imageHref = `/race/${slug}/result/${id}/opengraph-image`;
  const downloadFilename = `${athlete.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${slug}`;
```

Note: `shareUrl` is hardcoded to the production domain so the copied link works for the recipient even if the user is on a preview deployment. If you want it to use the current host instead, the ShareDialog component can default to `window.location.href` — but here we want the canonical URL, so we pass it explicitly.

- [ ] **Step 5.3: Replace the header block**

Replace the existing `<header>` block (lines 85-93) with:

```tsx
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {flag && <span className="mr-2">{flag}</span>}
            {athlete.fullName}
          </h1>
          <p className="text-gray-400 mt-1">
            <Link href={`/race/${slug}`} className="text-blue-400 hover:underline">{race.name}</Link> &middot; Bib #{athlete.bib} &middot; {athlete.ageGroup} &middot; {location}
          </p>
        </div>
        <ShareDialog url={shareUrl} imageHref={imageHref} filename={downloadFilename} />
      </header>
```

- [ ] **Step 5.4: Run dev server, verify visually**

Run: `cd app && npm run dev`

Visit a result URL (e.g., `http://localhost:3000/race/im-arizona-2005/result/1`). Expected:
- Ghost "Share" button in the top-right of the header.
- Clicking opens a popover with "Copy link" and "Download image".
- Clicking "Copy link" closes the popover and shows a "Link copied" toast.
- Clicking outside or pressing Escape closes the popover.
- (Download image will 404 until Task 6 — that's fine for now.)

Stop the dev server.

- [ ] **Step 5.5: TypeScript & lint check**

Run: `cd app && npx tsc --noEmit && npm run lint`
Expected: PASS for both.

- [ ] **Step 5.6: Commit**

```bash
git add app/src/app/race/\[slug\]/result/\[id\]/page.tsx
git commit -m "feat: add Share button to result page header"
```

---

## Task 6: OG Image Route

Returns the 1200×630 PNG. Next.js wires the file name `opengraph-image` into `<meta property="og:image">` and `<meta name="twitter:image">` automatically.

**Files:**
- Create: `app/src/app/race/[slug]/result/[id]/opengraph-image.tsx`

- [ ] **Step 6.1: Create the route**

Create `app/src/app/race/[slug]/result/[id]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { getRaceBySlug, getAthleteById, getDisciplineHistogram, getAllResults, getAgeGroupCount } from "@/lib/data";
import { getCountryFlagISO } from "@/lib/flags";

// Use Node runtime: getRaceBySlug / getDisciplineHistogram read from the filesystem.
export const runtime = "nodejs";

// Race results are static once scraped — cache the image for 1 day.
export const revalidate = 86400;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Triathlon result share card";

interface Params {
  params: Promise<{ slug: string; id: string }>;
}

export default async function Image({ params }: Params) {
  const { slug, id } = await params;
  const race = getRaceBySlug(slug);
  const athlete = race ? getAthleteById(slug, Number(id)) : null;

  if (!race || !athlete) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#0f172a",
            color: "white",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontFamily: "system-ui",
          }}
        >
          tritimes.org · result not found
        </div>
      ),
      { ...size }
    );
  }

  const totalFinishers = getAllResults(slug).length;
  const ageGroupTotal = getAgeGroupCount(slug, athlete.ageGroup);
  const overallPct = Math.max(1, Math.round((athlete.overallRank / totalFinishers) * 100));
  const agPct = Math.max(1, Math.round((athlete.ageGroupRank / ageGroupTotal) * 100));

  // We don't need split-level percentiles on the share card per Layout A; only times.
  const flag = getCountryFlagISO(athlete.countryISO) ?? "";
  const dateStr = race.date; // already a display-formatted date string in the data

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Name + race meta */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700 }}>
            {flag ? <span style={{ marginRight: 16 }}>{flag}</span> : null}
            {athlete.fullName}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#94a3b8", marginTop: 6 }}>
            {race.name} · {dateStr} · {athlete.ageGroup}
          </div>
        </div>

        {/* Hero finish time + percentile row */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 36 }}>
          <div style={{ display: "flex", fontSize: 18, color: "#94a3b8", letterSpacing: 3, textTransform: "uppercase" }}>
            Finish Time
          </div>
          <div style={{ display: "flex", fontSize: 140, fontWeight: 800, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {athlete.finishTime}
          </div>
          <div style={{ display: "flex", gap: 36, marginTop: 18, fontSize: 24, color: "#cbd5e1" }}>
            <div style={{ display: "flex" }}>
              Overall&nbsp;<span style={{ color: "#fbbf24", fontWeight: 700 }}>Top {overallPct}%</span>
            </div>
            <div style={{ display: "flex" }}>
              Age Group&nbsp;<span style={{ color: "#fbbf24", fontWeight: 700 }}>Top {agPct}%</span>
            </div>
          </div>
        </div>

        {/* Splits row */}
        <div style={{ display: "flex", marginTop: 40, gap: 24 }}>
          <Split label="Swim" time={athlete.swimTime} color="#3b82f6" />
          <Split label="Bike" time={athlete.bikeTime} color="#ef4444" />
          <Split label="Run" time={athlete.runTime} color="#f59e0b" />
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 28,
            right: 36,
            fontSize: 22,
            color: "#64748b",
            letterSpacing: 1,
            fontWeight: 700,
          }}
        >
          tritimes.org
        </div>
      </div>
    ),
    { ...size }
  );
}

function Split({ label, time, color }: { label: string; time: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: "20px 12px",
      }}
    >
      <div style={{ display: "flex", fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 38, fontWeight: 800, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
        {time}
      </div>
    </div>
  );
}
```

Note on `next/og` JSX: every node that contains text or multiple children needs an explicit `display: "flex"` (Satori requirement). The code above already follows this.

- [ ] **Step 6.2: TypeScript & lint check**

Run: `cd app && npx tsc --noEmit && npm run lint`
Expected: PASS for both.

- [ ] **Step 6.3: Run dev server, verify the image**

Run: `cd app && npm run dev`

In the browser, open `http://localhost:3000/race/im-arizona-2005/result/1/opengraph-image` (use a real result ID from `/race/im-arizona-2005`). Expected: a 1200×630 PNG showing the share card with Layout A.

Then go back to the result page itself (`http://localhost:3000/race/im-arizona-2005/result/1`), open the Share dialog, and click "Download image". Expected: browser downloads `<athlete-slug>-im-arizona-2005.png`.

Open the result page's source (View Source) and verify there's a `<meta property="og:image">` tag pointing to the `opengraph-image` URL.

Stop the dev server.

- [ ] **Step 6.4: Commit**

```bash
git add app/src/app/race/\[slug\]/result/\[id\]/opengraph-image.tsx
git commit -m "feat: generate OG share image for result pages"
```

---

## Task 7: Playwright E2E Coverage

Cover: pills render with expected text format, share button opens dialog, copy link works (via clipboard API exposed by Playwright), OG image route returns a PNG.

**Files:**
- Create: `app/e2e/result-share-and-pills.spec.ts`

- [ ] **Step 7.1: Write the e2e tests**

Create `app/e2e/result-share-and-pills.spec.ts`:

```ts
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
```

- [ ] **Step 7.2: Run the tests**

Run: `cd app && npx playwright test result-share-and-pills.spec.ts`
Expected: all 5 tests PASS.

If Playwright complains about missing browsers, run `cd app && npx playwright install chromium` first.

- [ ] **Step 7.3: Commit**

```bash
git add app/e2e/result-share-and-pills.spec.ts
git commit -m "test: e2e coverage for share dialog, percentile pills, and OG image"
```

---

## Task 8: Final Verification

- [ ] **Step 8.1: Full lint**

Run: `cd app && npm run lint`
Expected: PASS.

- [ ] **Step 8.2: Full vitest**

Run: `cd app && npm test`
Expected: PASS (including the new percentile tests and any pre-existing tests).

- [ ] **Step 8.3: Full playwright**

Run: `cd app && npx playwright test`
Expected: PASS (including new tests and the pre-existing `athlete-search`/`performance` specs).

- [ ] **Step 8.4: Full Next build (production)**

Run: `cd app && npm run build`
Expected: build succeeds. Check the build output for the new `opengraph-image` route and confirm there are no warnings about it.

- [ ] **Step 8.5: Smoke against production build**

```bash
cd app && npm run start &
SERVER_PID=$!
sleep 3
curl -sI http://localhost:3000/race/im-arizona-2005/result/1/opengraph-image | head -5
kill $SERVER_PID
```

Expected: `HTTP/1.1 200 OK` and `content-type: image/png`.

- [ ] **Step 8.6: Self-review the diff**

Run: `git diff main -- app/src` and read the diff. Verify:
- No leftover `console.log`, commented code, or TODOs.
- `PercentilePill` is only used where it should be (discipline cards), not elsewhere.
- `ShareDialog` is correctly client-only (`"use client"` directive present).
- The OG image route's JSX uses `display: "flex"` on every parent with children — required by Satori.

---

## Done When

- All 8 tasks above are checked off.
- `npm test`, `npm run lint`, `npm run build`, and `npx playwright test` all pass.
- A manually opened result page in dev:
  - Shows 4 percentile pills on the discipline cards.
  - Has a working Share button (Copy link + Download image).
  - The OG image route returns a polished PNG.

Out of scope for this plan (deferred):
- AthleteRaceList percentile pills.
- Per-discipline percentile pill color variation by performance band.
- Web Share API integration.

