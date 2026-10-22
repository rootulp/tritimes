// Race-manifest helpers (pure; the manifest itself is loaded by build-cache.ts).

import { getRaceLocation } from "./raceLocation";
import type { CourseEdition, CourseInfo, RaceInfo } from "./types";

export function courseSlugOf(slug: string): string {
  return slug.replace(/-\d{4}$/, "");
}

export function editionYear(slug: string): string {
  const m = slug.match(/-(\d{4})$/);
  return m ? m[1] : "";
}

/** Every course in the manifest, keyed by base slug, editions newest first. */
export function groupCourses(races: RaceInfo[]): Map<string, CourseInfo> {
  const bySlug = new Map<string, RaceInfo[]>();
  for (const r of races) {
    const course = courseSlugOf(r.slug);
    const list = bySlug.get(course) || [];
    list.push(r);
    bySlug.set(course, list);
  }
  const courses = new Map<string, CourseInfo>();
  for (const [course, list] of bySlug) {
    const editions: CourseEdition[] = list
      .map((r) => ({ slug: r.slug, year: editionYear(r.slug), date: r.date, finishers: r.finishers }))
      .sort((a, b) => b.year.localeCompare(a.year));
    const recent = list.find((r) => r.slug === editions[0].slug)!;
    courses.set(course, {
      course,
      name: recent.name.replace(/^\d{4}\s+/, ""),
      location: getRaceLocation(recent) ?? "",
      distance: course.startsWith("im703-") ? "70.3" : "140.6",
      editions,
    });
  }
  return courses;
}
