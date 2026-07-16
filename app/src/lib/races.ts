import fs from "fs";
import path from "path";
import { getRaceLocation } from "./raceLocation";
import { RaceInfo, CourseInfo, CourseEdition } from "./types";

// Race-manifest access (data/races.json only). This module is imported by
// instrumentation.ts — which is bundled into EVERY Node function — and by
// routes that need nothing else (sitemap, /races). It must never read other
// files under data/: each fs path referenced here is copied into the traced
// bundle of every importing function (see import-graph.test.ts and #216).
// Corpus-reading code (CSVs, histograms, athlete index) lives in data.ts.

interface RaceManifestEntry {
  slug: string;
  name: string;
  date: string;
  location: string;
  eventId: string;
  finishers: number;
}

function manifestPath(): string {
  return path.join(process.cwd(), "..", "data", "races.json");
}

function loadRaces(): RaceInfo[] {
  const raw = fs.readFileSync(manifestPath(), "utf-8");
  const entries: RaceManifestEntry[] = JSON.parse(raw);
  return entries.map((e) => ({
    slug: e.slug,
    name: e.name,
    date: e.date,
    location: e.location,
    finishers: e.finishers || 0,
  }));
}

let racesCache: RaceInfo[] | null = null;

// Test-only: inject a synthetic manifest so pure grouping logic can be tested
// without depending on the committed data/races.json.
export function __setRacesForTest(races: RaceInfo[]): void {
  racesCache = races.map((e) => ({
    slug: e.slug,
    name: e.name,
    date: e.date,
    location: e.location,
    finishers: e.finishers || 0,
  }));
}

export function getRaces(): RaceInfo[] {
  if (!racesCache) racesCache = loadRaces();
  return racesCache;
}

export function getRaceBySlug(slug: string): RaceInfo | undefined {
  return getRaces().find((r) => r.slug === slug);
}

export function getGlobalStats(): { raceCount: number; totalResults: number } {
  const raw = fs.readFileSync(manifestPath(), "utf-8");
  const entries: RaceManifestEntry[] = JSON.parse(raw);
  return {
    raceCount: entries.length,
    totalResults: entries.reduce((sum, e) => sum + (e.finishers || 0), 0),
  };
}

export function courseSlugOf(slug: string): string {
  return slug.replace(/-\d{4}$/, "");
}

function editionYear(slug: string): string {
  const m = slug.match(/-(\d{4})$/);
  return m ? m[1] : "";
}

export function getCourseInfo(courseSlug: string): CourseInfo | undefined {
  const editions: CourseEdition[] = getRaces()
    .filter((r) => courseSlugOf(r.slug) === courseSlug)
    .map((r) => ({
      slug: r.slug,
      year: editionYear(r.slug),
      date: r.date,
      finishers: r.finishers,
    }))
    .sort((a, b) => b.year.localeCompare(a.year)); // newest first

  if (editions.length === 0) return undefined;

  const recent = getRaces().find((r) => r.slug === editions[0].slug)!;
  return {
    course: courseSlug,
    name: recent.name.replace(/^\d{4}\s+/, ""),
    location: getRaceLocation(recent) ?? "",
    distance: courseSlug.startsWith("im703-") ? "70.3" : "140.6",
    editions,
  };
}
