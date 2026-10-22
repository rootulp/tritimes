# TriTimes on Cloudflare

Astro pre-renders the public pages; Preact adds search, charts, athlete histories,
and individual results. Cloudflare serves the complete build as static assets.
There is no server script, database, runtime secret, or paid hosting dependency.

Use Node 24 and npm (matching CI). Run commands from this directory:

```sh
npm ci
npm run build            # committed CSVs → static data + 3,273 HTML pages
npm run preview          # Cloudflare's local runtime, http://localhost:8787
npm test                 # pure data/search/chart tests
npm run check            # Astro + TypeScript
npx playwright install chromium
npm run e2e              # desktop and mobile against the built site
npm run test:design      # both themes, Chromium/Firefox/WebKit, desktop + phones
npm run verify:assets    # enforce Cloudflare Free file count and size limits
npm run audit:prepare    # build the original application's data artifacts
npm run audit            # compare the entire corpus against the original app
npm run benchmark        # repeated throttled browser measurements
npm run performance:report # enforce lab performance budgets
npm run lighthouse       # three independent mobile audits per critical route
```

`npm run dev` uses the previous data build. Rebuild after changing `data/`.
`npm run build:pages` reuses generated data when changing only UI code.
`BASE_URL=https://… npm run e2e` tests a deployment.
The design suite uses `BASE_URL` too. Install its engines with
`npx playwright install --with-deps chromium firefox webkit`. It captures ten page
types in both themes, runs automated accessibility checks, and tests theme
persistence, keyboard use, narrow layouts, search, filters, and sharing.
See [the design review and evidence](docs/design-review.md) for captures,
reproduction steps, and the limits of browser/device emulation.
`BASELINE_URL=http://localhost:3000 npm run benchmark` adds a Next.js comparison.
Set `CHROMIUM_PATH` to use a system Chromium; otherwise Playwright uses its
installed browser. Lighthouse uses Chrome discovered by chrome-launcher, or
`CHROMIUM_PATH` when set. Reports and screenshots land in gitignored `artifacts/`.

Deploy with `npm run deploy` after configuring Cloudflare credentials. CI tests
PRs and can deploy isolated previews when repository secrets exist. Production
deployments run automatically on relevant pushes to `main`, including merged
scraper updates. Manual workflow runs can deploy either preview or production.
The `inspect-domains` option checks the deployment token's DNS access without
modifying any records. Custom-domain routing is managed separately in Cloudflare.

Read [the migration report](docs/migration.md) before cutover. It explains
functional coverage, performance evidence, the free-plan fit, and the deliberate
SEO/HTTP differences on athlete and result pages.
