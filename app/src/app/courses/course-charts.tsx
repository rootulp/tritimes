"use client";

import { useState } from "react";
import type { CourseStats } from "@/lib/types";
import CourseBarChart from "@/components/CourseBarChart";

const DISCIPLINES = [
  {
    key: "medianFinishSeconds" as const,
    label: "Overall",
    color: "#22c55e",
  },
  {
    key: "medianSwimSeconds" as const,
    label: "Swim",
    color: "#3b82f6",
  },
  {
    key: "medianBikeSeconds" as const,
    label: "Bike",
    color: "#ef4444",
  },
  {
    key: "medianRunSeconds" as const,
    label: "Run",
    color: "#f59e0b",
  },
];

export default function CourseCharts({
  courses,
}: {
  courses: CourseStats[];
}) {
  const [distance, setDistance] = useState<"70.3" | "140.6">("70.3");

  const filtered = courses.filter((c) => c.distance === distance);

  const btnClass = (active: boolean) =>
    active
      ? "px-3 py-1.5 rounded-full text-sm font-medium bg-white/10 text-white ring-1 ring-white/20"
      : "px-3 py-1.5 rounded-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors";

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">
          Distance
        </span>
        {(["70.3", "140.6"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDistance(d)}
            className={btnClass(distance === d)}
          >
            {d}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {filtered.length} courses
      </p>

      <div className="space-y-8">
        {DISCIPLINES.map((disc) => (
          <CourseBarChart
            key={disc.key}
            courses={filtered}
            disciplineKey={disc.key}
            color={disc.color}
            label={disc.label}
          />
        ))}
      </div>
    </>
  );
}
