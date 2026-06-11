# Journey Performance Test — Design

**Date:** 2026-06-10
**Status:** Approved

## Problem

Live profiling of `tritimes.org` (Vercel, region `iad1`) showed the
home → search → athlete-page journey takes ~6–13s on its first interaction.
Measured breakdown:

| Step | Cold (first hit) | Warm | Edge-cached |
|---|---|---|---|
| `/api/search?q=…` | 7,707 ms | 48–115 ms | 21 ms |
| `/athlete/[slug]` | 6,373 ms | 121–192 ms | 35 ms |

The data work (CSV parse + histogram compute) for a brand-new path is only
~120–190 ms. The dominant cost is **Vercel serverless cold start** (~5.5–7.7s
lambda boot). The function idles out within ~1–2 minutes, so an occasional
visitor pays this tax on almost every visit. Fluid Compute is already enabled.

We need an **objective, automated way to verify** the cold-path journey is fast
*before* attempting a fix, and to confirm the fix worked.

## Goal

A pass/fail test that measures the wall-clock time an end user experiences
going from the home page to an athlete's page, on a **cold / uncached** path,
and fails if it exceeds the agreed budget.

## Non-Goals

- Replacing the existing per-page `performance.spec.ts` (web-vitals) or the
  functional `athlete-search.spec.ts`.
- Measuring local-dev performance (cold start does not occur on `next dev`).
- Implementing the fix itself (separate follow-up).

## Decisions

| Decision | Choice |
|---|---|
| Test target | Production / preview deployment via `BASE_URL` |
| Destination page | Athlete profile `/athlete/[slug]` (where search results link) |
| Pass/fail budget | End-to-end total **< 2,500 ms** |
| Tooling | Playwright (existing setup, real-browser UX timing) |

## Design (Approach B — dedicated spec)

**File:** `app/e2e/journey-performance.spec.ts`

Behavior:

1. **Guard:** `test.skip()` when `BASE_URL` is unset or points at
   `localhost`/`127.0.0.1`. Cold start is meaningless locally; skipping
   prevents a false green.
2. **Force an uncached destination:** pick a random surname from a small pool,
   type it into the home search box, wait for the results dropdown, click a
   random result. A different athlete per run ⇒ the destination page is not
   edge-cached ⇒ a real server render happens every run.
3. **Wall-clock timing** of three legs (mirrors `athlete-search.spec.ts`):
   - homepage load
   - search results appear (includes the 300 ms debounce — part of UX)
   - athlete page navigation + content visible
4. **Assert** `total < 2500ms`. Log the per-leg breakdown in the assertion
   message so a failure shows where the time went.
5. **No retries** for this spec (`test.describe.configure({ retries: 0 })`): a
   Playwright retry would hit a now-warm function and mask a cold failure.

## How it is run

```bash
# Against a freshly-deployed preview (functions cold by construction)
BASE_URL=https://<preview-url> npx playwright test journey-performance
```

Recommended in CI immediately after a preview deploy so the run reliably
exercises a cold function.

## Cold-start determinism

Two levers make the cold path reproducible:

1. Random uncached athlete each run → forces a real render (never edge-cached).
2. Running against a **freshly-deployed** preview → all serverless functions
   start cold.

Both, plus `retries: 0`, keep the gate honest: **red today** (cold ≈ 6–13s),
**green** only when the fix makes the path fast regardless of function warmth.

## Acceptance

- Test exists, is skipped locally with a clear message, and runs against a
  remote `BASE_URL`.
- Pointed at the current production deploy on a cold/uncached path, it **fails**
  the < 2,500 ms assertion — establishing the objective baseline.
