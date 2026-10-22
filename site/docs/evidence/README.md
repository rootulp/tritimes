# Recorded migration evidence

The implementation fits Cloudflare Workers Free and preserves the audited data
and tested user workflows. This report distinguishes exhaustive data checks from
sampled browser performance; it does not claim every user or URL is faster.

Production was cut over on 2026-10-22. All 40 desktop/mobile browser tests passed
on `https://www.tritimes.org`, together with the 3,276-URL HTTP/data audit.
The [production report](cloudflare-production.json) records the deployed source,
workflow runs, redirects, audit results and remaining Vercel owner actions.

## Functional and deployment checks

| Check | Result |
|---|---:|
| New site unit tests | 186 passed |
| Original app unit tests | 210 passed |
| Desktop/mobile browser checks on Cloudflare's local runtime | 40 passed |
| Browser interaction checks on the owned workers.dev preview | 40 passed; [recorded evidence](cloudflare-owned-preview.json) |
| Races audited against the original data layer | 1,539 |
| Complete displayed result records and stable IDs checked | 2,216,440 |
| Complete athlete profiles compared | 876,538 |
| Course statistics, leaderboards and filter arrays compared | 185 |
| Sampled six-discipline/scope histogram comparisons | 55,260 |
| Original search files compared byte for byte | 1,031 |
| Additional search partitions checked for membership and ordering | 2,228 |
| Built files (Free limit: 20,000) | 12,386 |
| Generated HTML pages | 3,273 |
| Internal URLs checked for files or supported shell patterns | 33,790 |
| Live Cloudflare URLs returning HTTP 200 | 3,276 |

The largest output file is `dist/courses/im703-mallorca.html` at
2,188,905 bytes, below the 25 MiB per-file limit. The live
check also confirmed true 404s for missing static pages and byte-compared
representative race/course/index and fine-search payloads after HTTPS download.

[Full corpus audit](parity.json), [asset/link checks](assets.json),
[live HTTP/data report](deployment.json), [all live route responses](deployment-routes.json).
The corpus report records its SHA-256 and source revision. The browser suite's
source and the workflow let reviewers reproduce the interaction checks.

## Repeated browser comparison

Five fresh browser contexts per route/build, 390×844 viewport, disabled browser
cache, 150 ms added latency, 1.6 Mbps download, 0.75 Mbps upload, 4× CPU slowdown.
These are **local production builds on the same host**, not remote Vercel versus
Cloudflare measurements. The baseline server is warm and pays no Vercel network
or serverless cold-start cost. p75 uses nearest rank over five samples.

| Route | Static p75 LCP | Next p75 LCP | Static p75 real content ready | Static p75 CLS |
|---|---:|---:|---:|---:|
| `/` | 0.444 s | 0.700 s | 0.576 s | 0.000 |
| `/races` | 0.576 s | 0.684 s | 1.132 s | 0.000 |
| `/courses` | 0.436 s | 0.760 s | 0.569 s | 0.000 |
| `/courses/im703-swansea` | 0.460 s | 0.784 s | 0.596 s | 0.000 |
| `/race/im703-oceanside-2025` | 0.456 s | 0.756 s | 0.573 s | 0.000 |
| `/race/im-arizona-2025/result/0` | 1.516 s | 0.756 s | 1.866 s | 0.000 |
| `/athlete/rootul-patel--us-m` | 1.472 s | 0.708 s | 1.484 s | 0.082 |
| `/stats` | 0.460 s | 0.752 s | 0.572 s | 0.000 |
| `/faq` | 0.436 s | 0.696 s | 0.570 s | 0.000 |

All nine static routes pass the recorded lab budgets: p75 LCP <2.5 s,
FCP <1.8 s, CLS ≤0.1, and real content ready <3 s. The result must show
percentile pills and the athlete page must show race controls before being
counted ready. This avoids timing only the loading skeleton.

The homepage downloads a median 13,208 JavaScript bytes
versus 139,850 in Next (90.6% less). These are
encoded response-body bytes, not authored source sizes. The full
[sample data](browser.json) and [summary](performance.json) include all routes,
bytes, host/browser details and timestamps.

**The warm Next server is faster on the individual result and athlete pages.**
The static build's advantage is lower initial code delivery and no per-request
application execution, plus faster measured search journeys. The table retains
the slower cases rather than claiming a universal speedup.

## Home → search → athlete journeys

Five runs per query/build with the same throttling; normal framework navigation
and prefetch behavior remains enabled. Timings include automation overhead.

| Query | Static p75 search | Next p75 search | Static p75 complete journey | Next p75 complete journey |
|---|---:|---:|---:|---:|
| Rootul Patel | 0.86 s | 3.77 s | 2.86 s | 5.82 s |
| Mark Smith | 1.36 s | 8.10 s | 3.28 s | 10.10 s |
| Maria Garcia | 0.90 s | 8.02 s | 2.83 s | 10.00 s |

The [earlier static implementation](before-search-partitioning.json) needed a
p75 5.41 s for the Rootul Patel journey, including about 3.4 s for search. The
final adaptive partitions retain the original matching behavior while shrinking
that lookup from 497,977 to 7,290 compressed bytes. Two-letter queries and
substring-only matches still use the original parent file and can be slower;
the smaller download claim applies to eligible longer prefix queries.

## Lighthouse mobile audits

Three fresh Chromium processes per route with Lighthouse 12.6.1's default mobile
simulated Slow 4G/4× CPU conditions. The largest generated HTML page is included
as a stress case. Ranges show all three runs, rather than the best result.

| Route | Performance scores | LCP range | Max TBT | Accessibility | SEO checks |
|---|---:|---:|---:|---:|---:|
| `/` | 100–100 | 0.91–1.22 s | 0 ms | 100 | 100 |
| `/races` | 99–100 | 1.26–1.57 s | 0 ms | 95 | 100 |
| `/race/im703-oceanside-2025` | 100–100 | 0.92–1.37 s | 0 ms | 95 | 100 |
| `/race/im-arizona-2025/result/0` | 99–99 | 2.26–2.26 s | 10 ms | 89 | 100 |
| `/athlete/rootul-patel--us-m` | 98–98 | 1.84–1.87 s | 4 ms | 94 | 100 |
| `/courses/im703-swansea` | 100–100 | 1.37–1.52 s | 0 ms | 95 | 100 |
| `/courses/im703-mallorca` | 94–96 | 1.97–2.04 s | 212 ms | 95 | 100 |

[Lighthouse measurements](lighthouse.json). Full HTML/JSON audits, screenshots
and Playwright reports are generated under `site/artifacts/` and uploaded by CI
with seven-day retention. Lighthouse's SEO score checks basic technical tags;
it **does not prove personalized metadata or indexing parity** for client-rendered
athlete/result pages. TBT is a lab metric, not real-user INP.

## Review before cutover

Athlete/result pages require JavaScript, give generic metadata to non-JavaScript
social crawlers, and use soft 404s for missing entries. Client PNG downloads are
preserved; the old dynamic image endpoint and search API fallback are absent.
Race/course/article pages remain pre-rendered. See the
[migration guide](../migration.md) for all differences and deployment/rollback.

The temporary [Cloudflare preview](https://tritimes-migration-preview.lackadaisical-tracker.workers.dev)
may expire. Its HTTP/data verification is distinct from local browser tests;
the optional live browser CI job tests that public origin with normal HTTPS trust.
That job received Cloudflare's **403 “Performing security verification” challenge**
on GitHub's hosted runner and could not reach TriTimes. This is a recorded blocker,
not a passing interaction test: [diagnostic evidence](live-browser.json) and
[CI log](https://github.com/rootulp/tritimes/actions/runs/39734549244/job/119677215232).
The owned preview at `https://tritimes-preview.rootulp.workers.dev` subsequently
passed all 40 desktop/mobile browser checks on 2026-10-22 with normal TLS
verification. The HTTP audit also passed all 3,276 URLs and checked raw gzip
race/search downloads against the build. The constructor/toString/__proto__
missing-athlete regression checks passed with no uncaught JavaScript errors in
the additional smoke checks. See [the owned-preview report](cloudflare-owned-preview.json).
The earlier temporary-host failure is retained as historical diagnostic evidence.
That original report preceded the production cutover. Production DNS now uses
Cloudflare and Vercel Git deployments are disabled. The Next source is retained;
Vercel project deletion and Pro cancellation remain separate owner actions.

These reports prove the recorded assertions and measurements for this corpus,
source and host. They are not field Core Web Vitals, global CDN coverage, an
exhaustive test of every interaction, or a guarantee about every user's device
and connection. Reproduction commands and measurement limits are in the
[migration guide](../migration.md).

[Mobile home screenshot](mobile-home.png) · [Mobile result screenshot](mobile-result.png)
