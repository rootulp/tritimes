# Search Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce perceived search latency on production by warming the serverless function on page load and extending CDN cache TTL.

**Architecture:** Two changes — (1) a client-side prefetch fires `/api/search?q=a` on homepage load to warm the serverless function before the user types, and (2) the search API `s-maxage` increases from 1 hour to 24 hours so repeated queries are served from CDN edge. Edge Runtime was evaluated but is infeasible (4 MB bundle limit vs 15 MB compressed index, no `fs`/`zlib` access).

**Tech Stack:** Next.js 16, React 19, TypeScript, Playwright

---

### Task 1: Increase search API cache TTL

**Files:**
- Modify: `app/src/app/api/search/route.ts:13`

**Step 1: Update the Cache-Control header**

Change `s-maxage=3600` (1 hour) to `s-maxage=86400` (24 hours) in the search API response:

```typescript
headers: {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
},
```

**Step 2: Verify the dev server serves the updated header**

Run:
```bash
cd app && npm run dev
# In another terminal:
curl -sI "http://localhost:3000/api/search?q=test" | grep -i cache
```

Expected: `Cache-Control: public, s-maxage=86400, stale-while-revalidate=86400`

**Step 3: Commit**

```bash
git add app/src/app/api/search/route.ts
git commit -m "perf: increase search API cache TTL from 1h to 24h"
```

---

### Task 2: Add search API prefetch on page load

**Files:**
- Modify: `app/src/hooks/useAthleteSearch.ts`

**Step 1: Add a module-level prefetch that fires once**

Add a prefetch call at the top of `useAthleteSearch.ts` that warms the serverless function when the module is first imported. This runs once per page load since the module is shared by both `GlobalSearchBar` and `CommandPalette`:

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import { track } from "@vercel/analytics";
import { AthleteSearchEntry } from "@/lib/types";

// Warm the search serverless function on first module load.
// Uses a short query to trigger index decompression without transferring much data.
let prefetchStarted = false;
if (typeof window !== "undefined" && !prefetchStarted) {
  prefetchStarted = true;
  fetch("/api/search?q=a", { priority: "low" }).catch(() => {});
}

export function useAthleteSearch() {
  // ... rest unchanged
```

**Step 2: Verify the prefetch fires on page load**

Run the dev server and open the browser Network tab:
```bash
cd app && npm run dev
```

1. Open http://localhost:3000 in Chrome
2. Open DevTools > Network tab
3. Look for a request to `/api/search?q=a` that fires automatically on page load
4. Confirm it returns 200 with search results

**Step 3: Commit**

```bash
git add app/src/hooks/useAthleteSearch.ts
git commit -m "perf: prefetch search API on page load to warm serverless function"
```

---

### Task 3: Run the Playwright benchmark to measure impact

**Files:**
- Read: `app/e2e/athlete-search.spec.ts`

**Step 1: Run the existing Playwright search timing test**

```bash
cd app && npx playwright test e2e/athlete-search.spec.ts --reporter=list
```

Expected: Test passes. Compare the `Search results` timing to the baseline of ~868ms. The prefetch should reduce this on warm runs since the index is already loaded when the test types into the search box.

Note: The improvement will be more visible on production (Vercel) than locally, since locally there's no real cold-start penalty. The main production benefit is:
- Prefetch hides the ~400ms+ cold start behind homepage load time
- 24h cache TTL means most queries never hit the function at all

**Step 2: Commit any test updates if needed**

If no changes needed, skip this step.
