# Search Performance Optimization Design

## Problem

The end-to-end search-to-athlete-page flow takes ~2.2s locally but feels significantly slower on production (tritimes.org) due to Vercel serverless cold starts, network round-trips, and CDN cache misses.

Benchmarking revealed the search algorithm itself is already fast (1-2ms warm), so the bottleneck is infrastructure: cold starts (~400ms+), network latency, and short cache TTLs.

## Strategies

### 1. Prefetch on page load

Fire a hidden `fetch("/api/search?q=a")` when the homepage loads to warm the serverless/edge function and load the search index into memory before the user starts typing.

- Add a `useEffect` in `GlobalSearchBar` or the homepage that calls the search API on mount
- Use low fetch priority to avoid blocking critical resources
- No UI change — purely a warming mechanism

### 2. Edge Runtime for search

Add `export const runtime = "edge"` to `/api/search` route to move from Node.js serverless to V8 Edge isolates with near-zero cold start.

- The search index is ~91 MB uncompressed; Edge Runtime has a 128 MB memory limit
- Need to verify the parsed index fits in memory
- If it doesn't fit, switch to a more compact in-memory representation (e.g., parallel arrays instead of array of objects) or reduce fields
- Fallback: keep serverless if Edge memory is insufficient; strategies 1 and 3 still apply

### 3. Increase cache TTL

Bump `Cache-Control` on `/api/search` responses from `s-maxage=3600` (1 hour) to `s-maxage=86400` (24 hours).

- The athlete index only changes when new races are scraped, so a longer TTL is safe
- Repeated queries served directly from Vercel's CDN edge with no function invocation

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Cold start (first search) | ~400ms+ | ~0ms (edge) or hidden (prefetch) |
| Repeated query | 1h cache then cold start | 24h CDN cache, instant |
| Network round-trip | Required | Still required, but served from edge CDN more often |

## What Won't Change

- Search algorithm (already optimized with binary search)
- Athlete page rendering (separate concern)
- 150ms debounce
