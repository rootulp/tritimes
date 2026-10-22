// Build-time (Node) loaders for the Astro pages: the race manifest, the
// committed aggregate artifacts in data/, and the per-page JSON written by
// scripts/build-data.ts. Never imported by browser code.

import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { AggregateStats, CourseStats, DistanceStats, RaceInfo } from "./types";
import type { CoursePageData, RacePageData, StatsPageData } from "./page-data";

const siteDir = process.cwd();
const dataDir = path.join(siteDir, "..", "data");
const pagesDir = path.join(siteDir, ".cache", "pages");

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, "utf-8"));
const readGzJson = <T>(file: string): T => JSON.parse(gunzipSync(fs.readFileSync(file)).toString());

let races: RaceInfo[] | null = null;
export function getRaces(): RaceInfo[] {
  races ??= readJson<RaceInfo[]>(path.join(dataDir, "races.json")).map((e) => ({
    slug: e.slug,
    name: e.name,
    date: e.date,
    location: e.location,
    finishers: e.finishers || 0,
  }));
  return races;
}

export const getRacePage = (slug: string) => readJson<RacePageData>(path.join(pagesDir, "race", `${slug}.json`));
export const getCoursePage = (course: string) => readJson<CoursePageData>(path.join(pagesDir, "course", `${course}.json`));
export const getStatsPage = () => readJson<StatsPageData>(path.join(pagesDir, "stats.json"));
export const getAggregateStats = () => readGzJson<AggregateStats>(path.join(dataDir, "aggregate-stats.json.gz"));
export const getCourseStats = () => readGzJson<CourseStats[]>(path.join(dataDir, "course-stats.json.gz"));
export const getDistanceStats = (distance: "70.3" | "140.6") =>
  readGzJson<Record<"70.3" | "140.6", DistanceStats>>(path.join(dataDir, "distance-stats.json.gz"))[distance];
