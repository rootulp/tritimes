"use client";

import { useState, useRef } from "react";
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

const SVG_WIDTH = 500;
const CHART_HEIGHT = 250;
const MARGIN = { top: 15, right: 10, bottom: 30, left: 55 };

function StackedBarChart({ data }: { data: BarDataPoint[] }) {
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxTotal = Math.max(...data.map((d) => d.total));
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const plotWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;

  const yTicks = getTimeTicks(maxTotal);
  const step = Math.max(1, Math.floor(data.length / 8));

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotLeft = (MARGIN.left / SVG_WIDTH) * rect.width;
    const plotRight = rect.width - (MARGIN.right / SVG_WIDTH) * rect.width;
    const plotW = plotRight - plotLeft;
    const relX = x - plotLeft;
    if (relX < 0 || relX > plotW) {
      setTooltipIdx(null);
      return;
    }
    setTooltipIdx(Math.min(data.length - 1, Math.floor((relX / plotW) * data.length)));
  }

  const point = tooltipIdx !== null ? data[tooltipIdx] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        style={{ height: CHART_HEIGHT }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltipIdx(null)}
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((tick) => {
          const y = MARGIN.top + innerHeight - (tick / maxTotal) * innerHeight;
          return (
            <g key={tick}>
              <line x1={MARGIN.left} y1={y} x2={SVG_WIDTH - MARGIN.right} y2={y} stroke="#374151" strokeWidth="0.5" />
              <text x={MARGIN.left - 5} y={y + 3} textAnchor="end" fill="#9ca3af" fontSize="11">{formatTime(tick)}</text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {data.map((d, i) => {
          const x = MARGIN.left + (i / data.length) * plotWidth;
          const bw = (plotWidth / data.length) * 0.7;
          const segments = [
            { value: d.swim, color: DISCIPLINE_COLORS.Swim },
            { value: d.bike, color: DISCIPLINE_COLORS.Bike },
            { value: d.run, color: DISCIPLINE_COLORS.Run },
            { value: d.transition, color: "#4b5563" },
          ];
          let yOffset = MARGIN.top + innerHeight;
          return (
            <g key={i}>
              {segments.map((seg, j) => {
                const h = maxTotal > 0 ? (seg.value / maxTotal) * innerHeight : 0;
                yOffset -= h;
                return (
                  <rect
                    key={j}
                    x={x}
                    y={yOffset}
                    width={bw}
                    height={h}
                    fill={seg.color}
                    rx={j === segments.length - 1 ? 2 : 0}
                  />
                );
              })}
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % step !== 0) return null;
          const x = MARGIN.left + ((i + 0.35) / data.length) * plotWidth;
          return (
            <text key={i} x={x} y={MARGIN.top + innerHeight + 16} textAnchor="middle" fill="#9ca3af" fontSize="11">
              {d.dateLabel}
            </text>
          );
        })}
      </svg>

      {point && (
        <div
          className="absolute pointer-events-none z-10 rounded-md px-3 py-2 text-[13px]"
          style={{
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            color: "#ededed",
          }}
        >
          <div className="font-semibold">{point.raceName}</div>
          <div className="text-[11px] text-gray-400 mb-1">{point.dateLabel}</div>
          <div className="space-y-0.5">
            <div style={{ color: DISCIPLINE_COLORS.Swim }}>Swim: {formatTime(point.swim)}</div>
            <div style={{ color: DISCIPLINE_COLORS.Bike }}>Bike: {formatTime(point.bike)}</div>
            <div style={{ color: DISCIPLINE_COLORS.Run }}>Run: {formatTime(point.run)}</div>
            {point.transition > 0 && <div style={{ color: "#6b7280" }}>T1+T2: {formatTime(point.transition)}</div>}
            <div className="border-t border-gray-600 pt-0.5 mt-0.5 font-semibold" style={{ color: DISCIPLINE_COLORS.Total }}>
              Total: {formatTime(point.total)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PercentileLineChart({ data, color }: { data: PercentileDataPoint[]; color: string }) {
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const plotWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const step = Math.max(1, Math.floor(data.length / 8));

  // Y-axis is 0-100, reversed (0 at top = best)
  const yTicks = [0, 25, 50, 75, 100];

  function getX(i: number) {
    return MARGIN.left + ((i + 0.5) / data.length) * plotWidth;
  }
  function getY(pct: number) {
    return MARGIN.top + (pct / 100) * innerHeight;
  }

  const points = data.map((d, i) => `${getX(i)},${getY(d.percentile)}`).join(" ");

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotLeft = (MARGIN.left / SVG_WIDTH) * rect.width;
    const plotRight = rect.width - (MARGIN.right / SVG_WIDTH) * rect.width;
    const plotW = plotRight - plotLeft;
    const relX = x - plotLeft;
    if (relX < 0 || relX > plotW) {
      setTooltipIdx(null);
      return;
    }
    setTooltipIdx(Math.min(data.length - 1, Math.floor((relX / plotW) * data.length)));
  }

  const point = tooltipIdx !== null ? data[tooltipIdx] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        style={{ height: CHART_HEIGHT }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltipIdx(null)}
      >
        {/* Y-axis grid */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line x1={MARGIN.left} y1={y} x2={SVG_WIDTH - MARGIN.right} y2={y} stroke="#374151" strokeWidth="0.5" />
              <text x={MARGIN.left - 5} y={y + 3} textAnchor="end" fill="#9ca3af" fontSize="11">{tick}%</text>
            </g>
          );
        })}

        {/* Line */}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />

        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={getX(i)} cy={getY(d.percentile)} r="4" fill={color} />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % step !== 0) return null;
          return (
            <text key={i} x={getX(i)} y={MARGIN.top + innerHeight + 16} textAnchor="middle" fill="#9ca3af" fontSize="11">
              {d.dateLabel}
            </text>
          );
        })}
      </svg>

      {point && (
        <div
          className="absolute pointer-events-none z-10 rounded-md px-3 py-2 text-[13px]"
          style={{
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            color: "#ededed",
          }}
        >
          <div className="font-semibold">{point.raceName}</div>
          <div className="text-[11px] text-gray-400">{point.dateLabel}</div>
          <div className="mt-1" style={{ color }}>Top {point.percentile}%</div>
        </div>
      )}
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

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">{label}</h3>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-400">Finish Time</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DISCIPLINE_COLORS.Swim }} />
                Swim
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DISCIPLINE_COLORS.Bike }} />
                Bike
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DISCIPLINE_COLORS.Run }} />
                Run
              </span>
            </div>
          </div>
          <StackedBarChart data={barData} />
        </div>

        <div>
          <span className="text-sm font-medium text-gray-400">Finish Percentile</span>
          <PercentileLineChart data={percentileData} color={color} />
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
      <h2 className="text-xl font-bold text-white mb-6">Performance Over Time</h2>
      <div className="space-y-8">
        {show703 && (
          <DistanceSection label="IRONMAN 70.3" races={races703} color={DISTANCE_COLORS["70.3"]} />
        )}
        {show1406 && (
          <DistanceSection label="IRONMAN" races={races1406} color={DISTANCE_COLORS["140.6"]} />
        )}
      </div>
    </section>
  );
}

function getTimeTicks(max: number): number[] {
  if (max <= 0) return [0];
  const step = Math.ceil(max / 4 / 1800) * 1800; // round to 30-min intervals
  if (step === 0) return [0];
  const ticks: number[] = [];
  for (let i = 0; i <= max; i += step) {
    ticks.push(i);
  }
  return ticks;
}
