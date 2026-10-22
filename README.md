# TriTimes

[TriTimes](https://tritimes.org) is a triathlon results viewer for Ironman and Ironman 70.3 races. Search for any athlete to see their race history and compare their swim, bike, and run performance against their age group and the overall field.

## Cloudflare migration

The proposed replacement lives in [`site/`](site/README.md): Astro generates static
HTML, with Preact islands for search, charts, result pages, and athlete histories.
It deploys to Cloudflare Workers Static Assets without server code or a paid
Workers subscription. The existing Next.js application in `app/` remains available
for production and rollback until cutover is approved.

See [`site/docs/migration.md`](site/docs/migration.md) for feature parity, costs,
measurement methodology, known differences, and deployment/cutover instructions.

## Local Development

Prerequisites: [Node.js](https://nodejs.org/) 18+

```bash
cd app
npm install
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production (also generates search index) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Credits

Built with [Claude Code](https://claude.ai/code) and [Conductor](https://conductor.build/).

## Inspiration

[hyresult.com](https://www.hyresult.com/)
