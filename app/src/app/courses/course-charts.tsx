"use client";

import { useState } from "react";
import type { CourseStats } from "@/lib/types";
import { DISCIPLINE_COLORS } from "@/lib/colors";
import CourseBarChart from "@/components/CourseBarChart";

const DISCIPLINES = [
  {
    key: "medianFinishSeconds" as const,
    label: "Overall",
    color: DISCIPLINE_COLORS.Total,
  },
  {
    key: "medianSwimSeconds" as const,
    label: "Swim",
    color: DISCIPLINE_COLORS.Swim,
  },
  {
    key: "medianBikeSeconds" as const,
    label: "Bike",
    color: DISCIPLINE_COLORS.Bike,
  },
  {
    key: "medianRunSeconds" as const,
    label: "Run",
    color: DISCIPLINE_COLORS.Run,
  },
];

export default function CourseCharts({
  courses,
}: {
  courses: CourseStats[];
}) {
  const [distance, setDistance] = useState<"70.3" | "140.6">("70.3");

  const filtered = courses.filter(
    (c) =>
      c.distance === distance &&
      !c.course.match(/world-championship-(men|women)$/)
  );

  const btnClass = (active: boolean) =>
    active
      ? "px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white ring-1 ring-white/20"
      : "px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors";

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
