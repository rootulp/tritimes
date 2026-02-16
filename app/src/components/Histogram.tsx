"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { HistogramData } from "@/lib/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  data: HistogramData;
  color: string;
  label: string;
}

export default function Histogram({ data, color, label }: Props) {
  if (data.bins.length === 0) return null;

  // Show every Nth label to avoid crowding
  const step = Math.max(1, Math.floor(data.bins.length / 8));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          Faster than {data.athletePercentile}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data.bins} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            interval={step - 1}
          />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={40} />
          <Tooltip
            formatter={(value: number | undefined) => [value ?? 0, "Athletes"]}
            labelFormatter={(label) => `Time: ${label}`}
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", color: "#ededed" }}
          />
          <ReferenceLine
            x={data.bins.find((b) => b.isAthlete)?.label}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.bins.map((bin, i) => (
              <Cell
                key={i}
                fill={bin.isAthlete ? color : "#374151"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 text-center mt-1">
        Your time: {formatTime(data.athleteSeconds)}
      </div>
    </div>
  );
}
