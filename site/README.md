# TriTimes static site (Cloudflare)

A static rewrite of the Next.js app in `../app`, served by Cloudflare Workers
Static Assets. There is no server code: every request is a static file, which
Cloudflare serves for free with no request limit.

```
data/*.csv ──► scripts/build-data.ts ──► public/data/**, public/search-shards/**   (gzipped JSON/TSV)
                                    └──► .cache/pages/**   (per-page JSON)
                  astro build ──────────► dist/   (HTML for every race, course, stats page + data files)
              wrangler deploy ──────────► Cloudflare
```

- **Pre-rendered HTML** (indexable): home, `/races`, every `/race/<slug>`, every
  `/courses/<course>` and `/courses/<course>/<year>`, `/stats/**`, `/faq`.
- **Rendered in the browser** from one shell each (`public/_redirects` rewrites the
  URL, the address bar keeps it): `/race/<slug>/result/<id>` loads
  `/data/race/<slug>.json.gz`; `/athlete/<slug>` loads one of 4,096 athlete shards
  plus `/data/races.json.gz`.
- Interactive pieces are small Preact islands; the races filter and header are
  plain scripts. Links prefetch on hover.

## Commands

```bash
npm ci
npm run build        # build-data (~2.5 min) + astro build (~15 s)
npm run build:pages  # astro build only, reusing the last data build
npm run preview      # serve dist/ with wrangler dev on :8787 (same routing as Cloudflare)
npm test             # unit tests (vitest)
npx playwright test  # e2e against wrangler dev (or BASE_URL=https://…)
npm run deploy       # wrangler deploy (needs CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID)
```

## Deploys

`.github/workflows/site.yml` tests every PR, uploads a preview version
(`pr-<number>-tritimes.<subdomain>.workers.dev`), and deploys production on merge to
`main`. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets.

## Moving tritimes.org

1. In the Cloudflare dashboard: Workers & Pages → `tritimes` → Settings → Domains &
   Routes → add custom domains `www.tritimes.org` and `tritimes.org`.
   (The zone is already on Cloudflare; remove the Vercel DNS records it replaces.)
2. Optional: enable Web Analytics for the zone, or set `PUBLIC_CF_BEACON_TOKEN` at
   build time; set `GOOGLE_SITE_VERIFICATION` at build time to keep the Search
   Console tag.
3. Once traffic has moved, delete the Vercel project and `../app`.
