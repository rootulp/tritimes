import { useState } from "preact/hooks";
import CourseBarChart from "./CourseBarChart";
import CourseList from "./CourseList";
import type { CourseStats } from "@/lib/types";
import { DISCIPLINE_COLORS } from "@/lib/colors";
import { isProCourse } from "@/lib/chart-utils";

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

  // Pro-only scrape artifacts never belong in either view.
  const forDistance = courses.filter(
    (c) => c.distance === distance && !isProCourse(c.displayName)
  );
  // Charts exclude world championships so the difficulty comparison stays fair;
  // the full list below still includes them.
  const chartCourses = forDistance.filter((c) => !c.course.includes("world-championship"));

  const btnClass = (active: boolean) =>
    active
      ? "px-4 py-2 rounded-full text-sm font-medium bg-selected text-foreground ring-1 ring-line"
      : "px-4 py-2 rounded-full text-sm font-medium text-secondary hover:text-foreground hover:bg-subtle transition-colors";

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-medium text-muted uppercase tracking-wider mr-1">
          Distance
        </span>
        {(["70.3", "140.6"] as const).map((d) => (
          <button
            key={d}
            aria-pressed={distance === d}
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
            courses={chartCourses}
            disciplineKey={disc.key}
            color={disc.color}
            label={disc.label}
          />
        ))}
      </div>

      <CourseList courses={forDistance} distance={distance} />
    </>
  );
}
