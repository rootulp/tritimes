import { getRaces } from "@/lib/build-cache";

const SITE_URL = "https://tritimes.org";

// Result and athlete pages are intentionally excluded, as before.
export function GET() {
  const now = new Date().toISOString();
  const entries: [string, string, string, number][] = [
    ["/", now, "weekly", 1],
    ["/races", now, "weekly", 0.8],
    ["/courses", now, "monthly", 0.6],
    ["/stats", now, "weekly", 0.6],
    ["/stats/average-ironman-time", now, "monthly", 0.7],
    ["/stats/average-half-ironman-time", now, "monthly", 0.7],
    ...getRaces().map((r): [string, string, string, number] => [
      `/race/${r.slug}`,
      r.date ? new Date(r.date).toISOString() : now,
      "yearly",
      0.5,
    ]),
  ];
  const body = entries
    .map(
      ([loc, lastmod, freq, priority]) =>
        `<url>\n<loc>${SITE_URL}${loc === "/" ? "/" : loc}</loc>\n<lastmod>${lastmod}</lastmod>\n<changefreq>${freq}</changefreq>\n<priority>${priority}</priority>\n</url>`,
    )
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
