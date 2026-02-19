"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CourseStats } from "@/lib/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}m`;
}

type DisciplineKey =
  | "medianFinishSeconds"
  | "medianSwimSeconds"
  | "medianBikeSeconds"
  | "medianRunSeconds";

const MAX_COURSES = 10;

interface Props {
  courses: CourseStats[];
  disciplineKey: DisciplineKey;
  color: string;
  label: string;
}

export default function CourseBarChart({
  courses,
  disciplineKey,
  color,
  label,
}: Props) {
  const sorted = [...courses]
    .filter((c) => c[disciplineKey] > 0)
    .sort((a, b) => a[disciplineKey] - b[disciplineKey])
    .slice(0, MAX_COURSES);

  if (sorted.length === 0) return null;

  const data = sorted.map((c) => ({
    name: c.displayName,
    seconds: c[disciplineKey],
    finishers: c.totalFinishers,
    editions: c.editions,
  }));

  const barHeight = 36;
  const chartHeight = data.length * barHeight + 40;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4" style={{ color }}>
        {label}
      </h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={formatTime}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 12, fill: "#d1d5db" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number | undefined) => [formatTime(value ?? 0), "Median"]}
            labelFormatter={(name) => {
              const item = data.find((d) => d.name === name);
              if (!item) return name;
              return `${name} — ${item.finishers.toLocaleString()} finishers across ${item.editions} edition${item.editions !== 1 ? "s" : ""}`;
            }}
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              color: "#ededed",
            }}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />
          <Bar
            dataKey="seconds"
            fill={color}
            radius={[0, 4, 4, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
