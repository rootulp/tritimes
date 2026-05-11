import type { MetadataRoute } from "next";
import { getRaces } from "@/lib/data";

const SITE_URL = "https://tritimes.org";

// Individual result and athlete pages are intentionally excluded. The site
// has millions of those URLs and listing them encourages crawlers to walk
// the whole graph — each first visit costs an ISR write. Crawlers can still
// discover them organically via links from race pages if they choose to.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const races = getRaces();

  const indexPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/races`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/courses`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  const racePages: MetadataRoute.Sitemap = races.map((race) => ({
    url: `${SITE_URL}/race/${race.slug}`,
    lastModified: race.date ? new Date(race.date) : now,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [...indexPages, ...racePages];
}
