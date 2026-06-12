import fs from "fs";
import path from "path";
import { RaceInfo } from "./types";

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
