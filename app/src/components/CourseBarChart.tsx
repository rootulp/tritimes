"use client";

import { useState, useRef } from "react";
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

const SVG_WIDTH = 500;
const BAR_HEIGHT = 24;
const BAR_SPACING = 36;
const MARGIN = { top: 5, right: 10, bottom: 25, left: 100 };

export default function CourseBarChart({
  courses,
  disciplineKey,
  color,
  label,
}: Props) {
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const chartHeight = data.length * BAR_SPACING + MARGIN.top + MARGIN.bottom;
  const maxSeconds = Math.max(...data.map((d) => d.seconds));
  const plotWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;

  const xTicks = getTimeTicks(maxSeconds);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relY = y - (MARGIN.top / chartHeight) * rect.height;
    const barSpacingPx = (BAR_SPACING / chartHeight) * rect.height;
    if (relY < 0) {
      setTooltipIdx(null);
      return;
    }
    const idx = Math.floor(relY / barSpacingPx);
    if (idx >= 0 && idx < data.length) {
      setTooltipIdx(idx);
    } else {
      setTooltipIdx(null);
    }
  }

  const item = tooltipIdx !== null ? data[tooltipIdx] : null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color }}>
        {label}
      </h3>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${chartHeight}`}
          className="w-full"
          style={{ height: chartHeight }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltipIdx(null)}
        >
          {/* X-axis ticks at bottom */}
          {xTicks.map((tick) => {
            const x = MARGIN.left + (tick / maxSeconds) * plotWidth;
            return (
              <g key={tick}>
                <line x1={x} y1={MARGIN.top} x2={x} y2={chartHeight - MARGIN.bottom} stroke="#374151" strokeWidth="0.5" />
                <text x={x} y={chartHeight - MARGIN.bottom + 14} textAnchor="middle" fill="#9ca3af" fontSize="11">
                  {formatTime(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const y = MARGIN.top + i * BAR_SPACING + (BAR_SPACING - BAR_HEIGHT) / 2;
            const w = maxSeconds > 0 ? (d.seconds / maxSeconds) * plotWidth : 0;
            return (
              <g key={i}>
                <text
                  x={MARGIN.left - 5}
                  y={y + BAR_HEIGHT / 2 + 4}
                  textAnchor="end"
                  fill="#d1d5db"
                  fontSize="11"
                >
                  {d.name}
                </text>
                <rect
                  x={MARGIN.left}
                  y={y}
                  width={w}
                  height={BAR_HEIGHT}
                  rx="4"
                  fill={color}
                />
              </g>
            );
          })}
        </svg>

        {item && (
          <div
            className="absolute pointer-events-none z-10 rounded-md px-3 py-2 text-[13px]"
            style={{
              left: "50%",
              top: 10,
              transform: "translateX(-50%)",
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              color: "#ededed",
            }}
          >
            <div className="font-semibold">{item.name}</div>
            <div>Median: {formatTime(item.seconds)}</div>
            <div className="text-[11px] text-gray-400">
              {item.finishers.toLocaleString()} finishers across {item.editions} edition{item.editions !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeTicks(max: number): number[] {
  if (max <= 0) return [0];
  const step = Math.ceil(max / 5 / 600) * 600; // round to 10-min intervals
  if (step === 0) return [0];
  const ticks: number[] = [];
  for (let i = 0; i <= max; i += step) {
    ticks.push(i);
  }
  return ticks;
}
