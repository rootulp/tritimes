# Shareable Result Card + Inline Split Percentile Pills

**Date:** 2026-05-10
**Scope:** Two features bundled because they share data (per-discipline AG percentile) and one design pass.

## Problem

The result page is the most-trafficked page on TriTimes and the natural "I want to brag" moment for an athlete who just finished a race. Today:

1. The URL doesn't unfurl into a preview card when pasted into Slack / iMessage / Twitter — links look like raw text and lose virality.
2. There's no in-page "Share" affordance, so even users who want to share have to copy the URL bar manually.
3. Each discipline card (swim, bike, run, total) shows the time but no context — the user has to scroll into the histogram and visually estimate where they fall. The percentile *is* already computed (`getDisciplineHistogram` returns `athletePercentile`) but never surfaced as a number.

## Goals

- Every result-page URL unfurls into a polished 1200×630 OG image.
- A visible "Share" button on the result page exposes Copy link + Download image actions.
- Each discipline card shows the athlete's age-group percentile as a small corner pill.
- No regression in result-page TTFB (Time To First Byte). OG image generation is on a separate route, so it doesn't block page render.

## Non-goals

- No share-to-Instagram-Stories, native share sheet, or social-account auth. Web Share API is deferred.
- No new percentile reference selectors (toggle between AG / Gender / Overall). The pill is fixed to age group.
- No changes to the existing "Top X%" summary cards or histograms.
- No percentile pills on the `AthleteRaceList` rows in this pass — deferred to a follow-up because it requires loading each race's precomputed histogram, which warrants its own perf analysis.

## Design Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Share feature scope | OG image + Copy-link button + Download-image button |
| Share card layout | Layout A: dark gradient, name + race meta at top, huge centered finish time, overall + AG percentile row, three splits in a row below, `tritimes.org` wordmark bottom-right |
| Percentile reference | Age group only |
| Result page share button | Ghost button (subtle, header right) |
| Result page pill | Corner pill on each discipline card, label = just `X%` (e.g., `22%`) |

## Architecture

### Feature 1: Shareable result card

**OG image route** — `app/race/[slug]/result/[id]/opengraph-image.tsx`

Uses Next.js's built-in `ImageResponse` from `next/og`. The file's default export is the image — Next.js wires up `<meta property="og:image">` and `<meta name="twitter:image">` automatically. Standard config:

```ts
export const runtime = 'edge'; // or 'nodejs' if fs access is needed
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
```

The image function:

1. Reads `slug` and `id` from route params.
2. Loads the result via existing `getResult(slug, id)`.
3. For each discipline (swim, bike, run, finish), calls `getDisciplineHistogram(slug, athlete, discipline, 'ageGroup')` and `(..., 'overall')` to derive percentiles.
4. Renders the Layout-A JSX (a single React tree using `tw=` Tailwind-ish props supported by `ImageResponse`, or inline styles).
5. Returns `new ImageResponse(<jsx>, { ...size })`.

The same route doubles as the **download** URL. The Share dialog's "Download image" button is an `<a href="/race/[slug]/result/[id]/opengraph-image" download="result.png">`.

**Cache:** Edge-cached by Next.js by default. Add `export const revalidate = 86400` (1 day) — race results don't change.

**Share button + dialog** — new component `app/src/components/ShareDialog.tsx`

- Ghost-styled button in the result page header. Icon + "Share" label on desktop, icon-only ≤ sm breakpoint.
- Click opens a small popover anchored to the button (not a modal — less disruptive).
- Two actions:
  - **Copy link** — `navigator.clipboard.writeText(window.location.href)` → toast "Link copied".
  - **Download image** — `<a>` with `href` to OG image route and `download="<athlete-slug>-<race-slug>.png"`.
- Close on Escape and outside-click.

The result page (`app/race/[slug]/result/[id]/page.tsx`) gets `<ShareDialog url={...} downloadHref={...} filename={...} />` in the header row, right-aligned.

### Feature 2: Inline split percentile pills

**Component** — new `app/src/components/PercentilePill.tsx`

```tsx
export function PercentilePill({ percentile }: { percentile: number }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/15 text-amber-400 tabular-nums">
      {percentile}%
    </span>
  );
}
```

That's the whole component. Reusable; later we can pass `tone` for non-AG references.

**Integration point** — `app/race/[slug]/result/[id]/page.tsx`

Each of the four discipline cards (swim, bike, run, total) already has a layout in this file. Add:

1. A call to `getDisciplineHistogram(slug, athlete, discipline, 'ageGroup')` at the top of the page component (one call per discipline; results already used by `DisciplineSections`, so we can lift them to avoid duplication).
2. `<PercentilePill percentile={swimAgPctile} />` positioned absolutely in the top-right corner of each card.

The card itself stays exactly as it is — only adds `relative` to the parent and the absolute-positioned pill.

## Data flow

```
Result page (server component)
├─ getResult(slug, id)                                  → result
├─ getDisciplineHistogram(slug, result, "swim", "ageGroup")    → swim AG pctile
├─ getDisciplineHistogram(slug, result, "bike", "ageGroup")    → bike AG pctile
├─ getDisciplineHistogram(slug, result, "run", "ageGroup")     → run AG pctile
├─ getDisciplineHistogram(slug, result, "finish", "ageGroup")  → total AG pctile
└─ Renders <ShareDialog />, four discipline cards w/ <PercentilePill />, then <DisciplineSections />
                              (DisciplineSections already calls getDisciplineHistogram —
                               we'll pass the precomputed values down to avoid duplicate work,
                               or accept the duplicate calls since the histogram cache deduplicates.)

OG image route (separate, edge-cached)
├─ getResult(slug, id)
├─ getDisciplineHistogram × 4 (ageGroup) + 1 (overall, finish) → AG + overall percentiles
└─ ImageResponse with Layout-A JSX
```

## Component boundaries

| File | Responsibility | Depends on |
|---|---|---|
| `app/race/[slug]/result/[id]/opengraph-image.tsx` | Render the OG/share PNG | `getResult`, `getDisciplineHistogram`, `ImageResponse` |
| `components/ShareDialog.tsx` | Ghost button + popover with Copy / Download | Browser clipboard API |
| `components/PercentilePill.tsx` | Tiny styled span for a percentile number | None |
| `app/race/[slug]/result/[id]/page.tsx` | Compose: header w/ ShareDialog, discipline cards w/ pills | Above three |

Each unit is independently testable. PercentilePill is a pure render. ShareDialog has only client-side state. The OG image route is a pure server function of `(slug, id)`.

## Error handling

- **OG image** — if the result is not found, return a 404-styled fallback image with `tritimes.org · result not found`. Never throw — broken unfurls hurt growth.
- **Histogram missing** — `getDisciplineHistogram` already returns `athletePercentile: 0` when histogram data is missing. Render `—` instead of `0%` in the pill when this happens (treat 0 as "no data" — a true 0th-percentile finish is essentially impossible and would mean an error).
- **Copy link** — wrap `navigator.clipboard.writeText` in try/catch. On failure, fall back to a temporary `<input>` selection trick or just show "Copy failed — select the URL bar" in the toast.
- **Download** — works via `<a download>`. No JS error handling needed; browsers handle this natively.

## Testing strategy (TDD)

Per project CLAUDE.md (red/green TDD), each unit gets a failing test first, then the code:

1. **`PercentilePill`** — unit test (Jest + RTL): renders `22%` given `percentile={22}`; renders `—` given `percentile={0}`; has the amber pill styling.
2. **`ShareDialog`** — unit test: clicking the button opens the popover; clicking "Copy link" calls `navigator.clipboard.writeText` with the URL; Escape closes the popover.
3. **OG image route** — integration test: fetch `/race/<known-slug>/result/<known-id>/opengraph-image`, assert response is `image/png` and >5KB (smoke). A snapshot test of the JSX (not the rendered PNG) covers the layout.
4. **Result page integration** — RTL test renders the page server-component output (using existing test patterns in the repo if any; otherwise a smoke test that the four `PercentilePill`s appear).

If the repo currently has no testing setup for React server components, the spec falls back to: unit-test the pure components (`PercentilePill`, `ShareDialog`) and write a Playwright smoke that the share dialog opens and the OG image route returns 200.

## Open questions for implementation

None blocking. Two minor:

- **Pill color when percentile is bad** (e.g., 80%). The mockup used amber for everything; that reads as a positive achievement. Should ≥50% degrade to gray? **Default: keep amber for all.** It's a fact, not a judgment.
- **Edge runtime vs Node** for the OG image — depends on whether `getResult` and `getDisciplineHistogram` use `fs` (they do — they read CSVs and gzipped JSON). Use `runtime = 'nodejs'`.

## File list (concrete)

- New: `app/src/components/PercentilePill.tsx`
- New: `app/src/components/ShareDialog.tsx`
- New: `app/src/app/race/[slug]/result/[id]/opengraph-image.tsx`
- Modified: `app/src/app/race/[slug]/result/[id]/page.tsx` (add ShareDialog to header; add PercentilePill to four discipline cards; lift histogram calls)

Test files mirror the above.
