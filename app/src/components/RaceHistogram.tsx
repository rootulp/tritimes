"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { RaceHistogramData } from "@/lib/types";
import { formatTime } from "@/lib/format";

interface Props {
  data: RaceHistogramData;
  color: string;
  label: string;
}

export default function RaceHistogram({ data, color, label }: Props) {
  if (data.bins.length === 0) return null;

  const step = Math.max(1, Math.floor(data.bins.length / 8));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400">{label}</span>
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
          {data.medianSeconds > 0 && (
            <ReferenceLine
              x={data.bins.find((b) => data.medianSeconds >= b.rangeStart && data.medianSeconds < b.rangeEnd)?.label}
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{ value: "Median", position: "top", fill: "#9ca3af", fontSize: 11 }}
            />
          )}
          <Bar dataKey="count" radius={[2, 2, 0, 0]} fill={color} fillOpacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 text-center mt-1">
        {data.totalAthletes.toLocaleString()} athletes · Median: {formatTime(data.medianSeconds)}
      </div>
    </div>
  );
}
