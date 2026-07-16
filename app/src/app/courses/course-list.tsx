"use client";

import Link from "next/link";
import type { CourseStats } from "@/lib/types";
import { courseDetailHref } from "@/lib/races-url";

function formatTime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

// A complete, alphabetical list of every course for the selected distance.
// Unlike the top-10 charts above, this is the exhaustive, keyboard-navigable
// path from a course to its races.
export default function CourseList({
  courses,
  distance,
}: {
  courses: CourseStats[];
  distance: "70.3" | "140.6";
}) {
  const sorted = [...courses].sort((a, b) => a.displayName.localeCompare(b.displayName));

  if (sorted.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-white mb-1">All Courses</h2>
      <p className="text-sm text-gray-500 mb-4">
        {sorted.length} {distance} courses. Select one to see all of its races.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map((course) => (
          <li key={course.course}>
            <Link
              href={courseDetailHref(course.course)}
              className="group flex items-baseline justify-between gap-3 px-4 py-3 border border-gray-700/80 rounded-lg bg-gray-900 transition-colors duration-200 hover:border-gray-600 hover:bg-gray-800/80"
            >
              <span className="font-medium text-white group-hover:text-blue-300 transition-colors leading-tight">
                {course.displayName}
              </span>
              <span className="shrink-0 text-right text-xs text-gray-500 leading-tight">
                <span className="block text-gray-400">{formatTime(course.medianFinishSeconds)}</span>
                {course.editions} edition{course.editions !== 1 ? "s" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
