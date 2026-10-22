# Cloudflare migration review

The implementation in `site/` replaces the Vercel runtime with Cloudflare Workers
Static Assets. Astro generates HTML at build time; Preact powers interactive
islands. Committed race data remains the source of truth. This keeps the existing
design, URLs and data pipeline while removing per-request application execution.

## Cost and platform fit

Cloudflare documents [free, unlimited static asset requests and no additional
asset storage charge](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
The [Free plan permits 20,000 files per version and 25 MiB per file](https://developers.cloudflare.com/workers/platform/limits/#static-assets).
The build currently fits those limits; `npm run verify:assets` fails CI if it
outgrows them. No Worker script is configured, so the separate 100,000/day limit
on Worker invocations does not apply to these static requests. The request-time
hosting estimate is **$0/month** under the documented static-asset terms.

Domain registration remains separate. GitHub Actions minutes and retained test
artifacts remain subject to the repository owner's GitHub plan. Evidence artifacts
expire after seven days in CI; the small reviewed reports in `docs/evidence/`
remain in Git. Cloudflare's build service, R2, KV, D1 and a paid Workers plan are
not required. Monitor file growth as new races are added; paid Workers currently
has a higher asset-count allowance, but this migration doesn't enable it.

Cloudflare is a good fit because it supports the necessary static URL rewrites
and serves the existing corpus from its CDN. Astro avoids shipping a global
React/Next runtime while allowing the existing chart and UI logic to be ported
to small Preact islands. Rewriting every interaction in plain JavaScript would
add migration risk without removing the need to load the same underlying data.

## Feature parity

| Capability | Implementation and evidence |
|---|---|
| Home page, header, footer, mobile navigation | Static HTML with a small navigation script; desktop/mobile browser tests |
| Global athlete search and Ctrl/Cmd+K palette | Original shards and ranking retained; adaptive longer-prefix files reduce large downloads; keyboard navigation and retries tested |
| Athlete profiles and complete race histories | Stable slugs; compact static shards; every profile compared against the original generated profiles |
| Performance charts, hidden results, CSV export | Preact port; same localStorage key format; hide/reload/export tested |
| Race listing | Static cards; distance/year/text filters; shared query links; clear filters tested |
| Race summaries, splits, demographics, leaderboards | Static HTML; all race statistics compared with the original data layer |
| Gender/age distribution filters | Loads a static per-race or pooled-course file on first use; segment arrays audited; filters/reset tested |
| Individual result URLs, cards, six discipline distributions, scope toggles | Stable CSV row IDs; every displayed result field audited; histogram comparisons across every race; browser toggles tested |
| Course rankings, pooled editions, year navigation | Static HTML plus Preact charts; every pooled course audited; year links and old `?year=` URLs tested |
| Statistics, average-time articles, FAQ | Pre-rendered HTML from the existing aggregate artifacts; useful content works without JavaScript |
| Sharing | Canonical link copy and client-rendered 1200×630 PNG download tested on desktop and mobile |
| Crawlable race/course/article pages | Static title, description, canonical and structured data; robots and sitemap retained |
| Missing pages and transient failures | True static 404s for unknown race/course/year paths; client missing-page UI for results/profiles; retryable data/search errors |

The exhaustive audit covers data parity, rather than claiming pixel-identical
rendering or exhaustive coverage of every possible interaction. First/last names
are reconstructed from the full name in packed result payloads; those separate
fields aren't displayed. All displayed names, ranks, times, splits, location and
country fields are checked. DNF/DNS rows remain excluded, as in the original app.

## Deliberate differences to review

1. **Athlete and result pages require JavaScript.** Their generic HTML shells load
   static data. Titles, descriptions and canonical links become specific to the
   athlete after rendering. Crawlers and social bots that don't execute JavaScript
   receive generic metadata/image; indexing is not equivalent to server-rendered
   athlete profiles. The main race/course/article pages remain pre-rendered.
2. **Unknown athlete/result URLs return HTTP 200 shells.** They show the missing
   page and set `noindex` after data lookup. This is a soft 404. Unknown static
   race/course/year pages return real HTTP 404. Fully preserving dynamic status
   codes and personalized social metadata would require an edge function or
   millions of generated files; neither fits this assets-only free-plan design.
3. **Share PNGs are drawn in the browser.** Downloads work, but the old dynamic
   `/race/<slug>/result/<id>/opengraph-image` endpoint isn't implemented. Pasting
   a result URL into a social app uses the generic site image.
4. **The internal `/api/search` fallback is removed.** Browser search uses the
   same static shards directly. A failed download now offers a retry. Modern
   browsers supporting `DecompressionStream` are required for data and search.
5. **Vercel Analytics and Speed Insights are removed from this build.** Optional
   Cloudflare Web Analytics uses `PUBLIC_CF_BEACON_TOKEN` at build time. Existing
   Vercel metric history isn't migrated. `GOOGLE_SITE_VERIFICATION` remains an
   optional build-time setting.
6. **Data freshness follows deployments.** Merge new CSV data and rebuild/deploy
   the static site. Mutable data/shard URLs use a five-minute browser cache with
   stale-while-revalidate. Hashed JS/CSS assets cache immutably. A user with an
   older tab can briefly see an older dataset after a new deployment.

These are explicit tradeoffs, not claims of complete functional or SEO parity.
For an SEO requirement on every athlete/result, use a small Worker for those
routes and remeasure its free-tier capacity, cost and cold behavior before
choosing it over this static-only implementation.

## Evidence and reproduction

`docs/evidence/` contains the reviewed JSON reports for this implementation. CI
repeats the audit and browser checks and uploads raw measurements, screenshots,
Lighthouse HTML/JSON and the Playwright report to the workflow run.

The corpus audit compares against `app/src/lib/data.ts` and the original athlete
shard builder, rather than using the new encoding routine as its own oracle. It
checks all result IDs and displayed fields, all profile histories, all race and
course statistics/leaderboards/segment arrays, and byte-identical search shards.
It samples beginning/middle/end athletes for six disciplines and two scopes in
every race. Its report includes a SHA-256 of the manifest, athlete index and CSV
corpus so a later run can identify a data change.

Large search shards (128 KiB compressed and above) get additional longer-prefix
partitions, recursively up to eight characters. The small partition manifest is
embedded in the client bundle; there is no manifest-fetch waterfall. Longer
queries request the most specific available file directly. Two-character
queries still use the original file. If there are no prefix matches, the client
loads the original parent to preserve substring matches and ranking. Missing or
failed fine downloads can also use the parent. Every fine file is audited for
complete match membership and original ordering, and the base files remain
byte-identical to the original site. A slightly longer debounce for two-letter
input avoids starting its large download during ordinary continued typing.

For the original baseline:

```sh
cd app
npm ci
npm run build
npm start
```

In another terminal:

```sh
cd site
npm ci
npm run build
npm run audit:prepare
npm run audit
npm run preview
```

And while both production builds are running:

```sh
cd site
BASELINE_URL=http://127.0.0.1:3000 npm run benchmark
npm run performance:report
npm run lighthouse
```

The browser benchmark interleaves five runs per route/build with fresh contexts,
disabled browser cache, 390×844 viewport, 150 ms added latency, 1.6 Mbps download,
0.75 Mbps upload and 4× CPU slowdown. It records FCP, LCP, session-window CLS,
actual content readiness, transferred bytes and JavaScript bytes. The result page
must show percentile pills and the athlete page must show race controls before
being counted ready. It separately times home → search → athlete journeys for
Rootul Patel, Mark Smith and Maria Garcia, including the frameworks' normal
navigation/prefetch behavior.
The static build's p75 budgets are LCP <2.5 s, FCP <1.8 s, CLS ≤0.1 and actual
content ready <3 s. Three independent Lighthouse mobile audits per critical route
provide a second measurement method.

**Limits of the evidence:** these are repeatable lab measurements on a specific
host, not field Core Web Vitals, an INP measurement, proof about every user's
network/device, or a guarantee that every route is faster than Vercel. The local
Next baseline has no Vercel network or serverless cold-start cost and may beat
client-rendered static detail pages. A fresh browser cache doesn't imply a cold
CDN or function. Local Workers runtime results aren't global CDN measurements.
Use the same harness against real deployment URLs and collect field data after
cutover before making global latency claims. No benchmark can honestly provide
an irrefutable guarantee for all users.

`DEPLOYMENT_URL=https://<preview> npm run verify:deployment` checks every generated
HTML route on the real CDN, verifies representative shell rewrites and true 404s,
and downloads/decompresses/byte-compares representative data. It retains curl's
normal TLS verification and configured proxy trust. This provides live HTTP/data
evidence separately from browser interaction tests; it doesn't substitute for
running the browser suite on the intended persistent deployment.

## Deploy previews and production

The workflow in `.github/workflows/site.yml` builds/tests PRs. Configure repository
secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (scoped to the intended
account with Workers Scripts edit; no zone/DNS access is needed for workers.dev
previews). A PR deploys an isolated `tritimes-preview-pr-<number>` Worker. Main
pushes deploy `tritimes-preview`. Remove obsolete PR preview Workers when done.
The site is public data and these previews are public URLs.

Optional repository variables `GOOGLE_SITE_VERIFICATION` and
`PUBLIC_CF_BEACON_TOKEN` are passed to the build for Search Console and Cloudflare
Web Analytics. Both are public site identifiers, not deployment credentials.

Merging does **not** deploy production. A manual workflow dispatch on `main` with
`deploy=production` deploys the configured `tritimes` Worker. For manual CLI use,
authenticate with your intended account, run the checks, then `npm run deploy`.
No production custom domain is declared in the checked-in configuration.

Wrangler also supports `wrangler deploy --temporary --name <preview-name>` when
no account is authenticated. Temporary accounts expire unless claimed; their
claim URL is account access and must never be committed or put in a public PR.
A temporary preview is for review and testing, not a permanent hosting setup.

## Cutover and rollback

1. Review the parity/SEO differences, evidence and deployed preview. Run the
   browser suite against the intended persistent Cloudflare preview with
   `BASE_URL=https://<preview> npm run e2e`. Confirm all data assets and rewrites,
   including a known athlete and result, work on the actual Cloudflare hostname.
2. Deploy the production Worker explicitly. Configure `GOOGLE_SITE_VERIFICATION`
   and optional analytics at build time as needed. Add `tritimes.org` and
   `www.tritimes.org` as custom domains in the intended Cloudflare zone; check
   HTTPS, canonical URLs and the www/apex redirect behavior. Preserve the current
   apex → www redirect initially: hidden-result preferences are stored in
   origin-bound localStorage, so changing the primary hostname would give users
   a different storage origin even though the key format is preserved. Preview
   hosts naturally have separate preferences. Preserve the
   previous DNS records and Vercel project for rollback.
3. Re-run functional/performance checks on the custom domain, compare data
   freshness, inspect 404s, search and share downloads, and verify Search Console.
   Collect real-user latency and indexing evidence. Keep the Next app and its CI
   while this rollout is being evaluated; the exhaustive audit uses it as oracle.
4. If rollback is needed, restore the saved Vercel DNS/domain routing and leave
   Cloudflare preview URLs available for diagnosis. No data conversion is needed.
5. Cancel the Vercel Pro plan only after the custom domain is verified and the
   migration is accepted. Nothing in this PR cancels a subscription, changes DNS,
   deletes the existing app, or performs a production cutover.
