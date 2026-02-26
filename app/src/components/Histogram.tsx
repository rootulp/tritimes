"use client";

import { useState, useRef } from "react";
import { HistogramData } from "@/lib/types";
import { formatTime } from "@/lib/format";

interface Props {
  data: HistogramData;
  color: string;
  label: string;
}

const CHART_HEIGHT = 200;
const MARGIN = { top: 10, right: 10, bottom: 30, left: 45 };

export default function Histogram({ data, color, label }: Props) {
  if (data.bins.length === 0) return null;

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    bin: (typeof data.bins)[0];
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const bins = data.bins;
  const maxCount = Math.max(...bins.map((b) => b.count));
  const innerWidth = 100; // percentage-based
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  const barWidth = innerWidth / bins.length;

  // Y-axis ticks
  const yTicks = getYTicks(maxCount);

  // X-axis labels — show every Nth
  const step = Math.max(1, Math.floor(bins.length / 8));

  // Find athlete bin and median bin indices
  const athleteBinIdx = bins.findIndex((b) => b.isAthlete);
  const medianBinIdx =
    data.medianSeconds > 0
      ? bins.findIndex(
          (b) =>
            data.medianSeconds >= b.rangeStart &&
            data.medianSeconds < b.rangeEnd
        )
      : -1;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotLeft = (MARGIN.left / rect.width) * rect.width;
    const plotRight = rect.width - MARGIN.right;
    const plotWidth = plotRight - plotLeft;
    const relX = x - plotLeft;
    if (relX < 0 || relX > plotWidth) {
      setTooltip(null);
      return;
    }
    const idx = Math.min(
      bins.length - 1,
      Math.floor((relX / plotWidth) * bins.length)
    );
    const bin = bins[idx];
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, bin });
  }

  return (
    <div>
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-400">{label}</span>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 500 ${CHART_HEIGHT}`}
          className="w-full"
          style={{ height: CHART_HEIGHT }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Y-axis */}
          {yTicks.map((tick) => {
            const y =
              MARGIN.top + innerHeight - (tick / maxCount) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  y1={y}
                  x2={500 - MARGIN.right}
                  y2={y}
                  stroke="#374151"
                  strokeWidth="0.5"
                />
                <text
                  x={MARGIN.left - 5}
                  y={y + 3}
                  textAnchor="end"
                  fill="#9ca3af"
                  fontSize="11"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {bins.map((bin, i) => {
            const barH =
              maxCount > 0 ? (bin.count / maxCount) * innerHeight : 0;
            const x =
              MARGIN.left +
              (i / bins.length) * (500 - MARGIN.left - MARGIN.right);
            const bw =
              ((500 - MARGIN.left - MARGIN.right) / bins.length) * 0.85;
            const y = MARGIN.top + innerHeight - barH;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={bw}
                height={barH}
                rx="2"
                fill={bin.isAthlete ? color : "#374151"}
              />
            );
          })}

          {/* Athlete reference line */}
          {athleteBinIdx >= 0 && (
            <line
              x1={
                MARGIN.left +
                ((athleteBinIdx + 0.42) / bins.length) *
                  (500 - MARGIN.left - MARGIN.right)
              }
              y1={MARGIN.top}
              x2={
                MARGIN.left +
                ((athleteBinIdx + 0.42) / bins.length) *
                  (500 - MARGIN.left - MARGIN.right)
              }
              y2={MARGIN.top + innerHeight}
              stroke={color}
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* Median reference line */}
          {medianBinIdx >= 0 && (
            <g>
              <line
                x1={
                  MARGIN.left +
                  ((medianBinIdx + 0.42) / bins.length) *
                    (500 - MARGIN.left - MARGIN.right)
                }
                y1={MARGIN.top}
                x2={
                  MARGIN.left +
                  ((medianBinIdx + 0.42) / bins.length) *
                    (500 - MARGIN.left - MARGIN.right)
                }
                y2={MARGIN.top + innerHeight}
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x={
                  MARGIN.left +
                  ((medianBinIdx + 0.42) / bins.length) *
                    (500 - MARGIN.left - MARGIN.right)
                }
                y={MARGIN.top - 2}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="11"
              >
                Median
              </text>
            </g>
          )}

          {/* X-axis labels */}
          {bins.map((bin, i) => {
            if (i % step !== 0) return null;
            const x =
              MARGIN.left +
              ((i + 0.42) / bins.length) *
                (500 - MARGIN.left - MARGIN.right);
            return (
              <text
                key={i}
                x={x}
                y={MARGIN.top + innerHeight + 16}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="11"
              >
                {bin.label}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 rounded-md px-3 py-2 text-[13px]"
            style={{
              left: Math.min(tooltip.x, 300),
              top: tooltip.y - 60,
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              color: "#ededed",
            }}
          >
            <div>Time: {tooltip.bin.label}</div>
            <div>Athletes: {tooltip.bin.count}</div>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 text-center mt-1">
        Your time: {formatTime(data.athleteSeconds)}
      </div>
    </div>
  );
}

function getYTicks(max: number): number[] {
  if (max <= 0) return [0];
  const step = Math.ceil(max / 4);
  const ticks: number[] = [];
  for (let i = 0; i <= max; i += step) {
    ticks.push(i);
  }
  return ticks;
}
