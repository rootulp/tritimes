"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AthleteRaceEntry } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { DISCIPLINE_COLORS } from "@/lib/colors";

const DISTANCE_COLORS: Record<string, string> = {
  "70.3": "#3b82f6",
  "140.6": "#f97316",
};

function formatDateShort(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface BarDataPoint {
  dateLabel: string;
  raceName: string;
  swim: number;
  bike: number;
  run: number;
  transition: number;
  total: number;
}

interface PercentileDataPoint {
  dateLabel: string;
  raceName: string;
  percentile: number;
}

interface Props {
  races: AthleteRaceEntry[];
}

function StackedBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: BarDataPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div
      className="rounded-md px-3 py-2 text-[13px]"
      style={{
        backgroundColor: "#1f2937",
        border: "1px solid #374151",
        color: "#ededed",
      }}
    >
      <div className="font-semibold">{point.raceName}</div>
      <div className="text-[11px] text-gray-400 mb-1">{point.dateLabel}</div>
      <div className="space-y-0.5">
        <div style={{ color: DISCIPLINE_COLORS.Swim }}>
          Swim: {formatTime(point.swim)}
        </div>
        <div style={{ color: DISCIPLINE_COLORS.Bike }}>
          Bike: {formatTime(point.bike)}
        </div>
        <div style={{ color: DISCIPLINE_COLORS.Run }}>
          Run: {formatTime(point.run)}
        </div>
        {point.transition > 0 && (
          <div style={{ color: "#6b7280" }}>
            T1+T2: {formatTime(point.transition)}
          </div>
        )}
        <div
          className="border-t border-gray-600 pt-0.5 mt-0.5 font-semibold"
          style={{ color: DISCIPLINE_COLORS.Total }}
        >
          Total: {formatTime(point.total)}
        </div>
      </div>
    </div>
  );
}

function PercentileTooltip({
  active,
  payload,
  color,
}: {
  active?: boolean;
  payload?: Array<{ payload: PercentileDataPoint }>;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div
      className="rounded-md px-3 py-2 text-[13px]"
      style={{
        backgroundColor: "#1f2937",
        border: "1px solid #374151",
        color: "#ededed",
      }}
    >
      <div className="font-semibold">{point.raceName}</div>
      <div className="text-[11px] text-gray-400">{point.dateLabel}</div>
      <div className="mt-1" style={{ color }}>
        Top {point.percentile}%
      </div>
    </div>
  );
}

function DistanceSection({
  label,
  races,
  color,
}: {
  label: string;
  races: AthleteRaceEntry[];
  color: string;
}) {
  if (races.length < 2) return null;

  const barData: BarDataPoint[] = races.map((r) => {
    const disciplineSum = r.swimSeconds + r.bikeSeconds + r.runSeconds;
    const transition = Math.max(0, r.finishSeconds - disciplineSum);
    return {
      dateLabel: formatDateShort(r.raceDate),
      raceName: r.raceName,
      swim: r.swimSeconds,
      bike: r.bikeSeconds,
      run: r.runSeconds,
      transition,
      total: r.finishSeconds,
    };
  });

  const percentileData: PercentileDataPoint[] = races.map((r) => ({
    dateLabel: formatDateShort(r.raceDate),
    raceName: r.raceName,
    percentile: 100 - r.overallPercentile,
  }));

  const step = Math.max(1, Math.floor(barData.length / 8));

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">{label}</h3>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-400">
              Finish Time
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: DISCIPLINE_COLORS.Swim }}
                />
                Swim
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: DISCIPLINE_COLORS.Bike }}
                />
                Bike
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: DISCIPLINE_COLORS.Run }}
                />
                Run
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={barData}
              margin={{ top: 10, right: 10, bottom: 5, left: 10 }}
            >
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                interval={step - 1}
              />
              <YAxis
                tickFormatter={(v: number) => formatTime(v)}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                width={55}
              />
              <Tooltip
                content={<StackedBarTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar
                dataKey="swim"
                stackId="a"
                fill={DISCIPLINE_COLORS.Swim}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="bike"
                stackId="a"
                fill={DISCIPLINE_COLORS.Bike}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="run"
                stackId="a"
                fill={DISCIPLINE_COLORS.Run}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="transition"
                stackId="a"
                fill="#4b5563"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-400">
            Finish Percentile
          </span>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={percentileData}
              margin={{ top: 10, right: 10, bottom: 5, left: 10 }}
            >
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                interval={step - 1}
              />
              <YAxis
                reversed
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                width={40}
              />
              <Tooltip content={<PercentileTooltip color={color} />} />
              <Line
                type="monotone"
                dataKey="percentile"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function AthletePerformanceCharts({ races }: Props) {
  const valid = races.filter((r) => r.finishSeconds > 0);
  if (valid.length < 2) return null;

  const races703 = valid.filter((r) => r.distance === "70.3");
  const races1406 = valid.filter((r) => r.distance === "140.6");

  const show703 = races703.length >= 2;
  const show1406 = races1406.length >= 2;

  if (!show703 && !show1406) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-white mb-6">
        Performance Over Time
      </h2>
      <div className="space-y-8">
        {show703 && (
          <DistanceSection
            label="IRONMAN 70.3"
            races={races703}
            color={DISTANCE_COLORS["70.3"]}
          />
        )}
        {show1406 && (
          <DistanceSection
            label="IRONMAN"
            races={races1406}
            color={DISTANCE_COLORS["140.6"]}
          />
        )}
      </div>
    </section>
  );
}
