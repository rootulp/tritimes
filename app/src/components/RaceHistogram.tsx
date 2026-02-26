"use client";

import { useState, useRef } from "react";
import { RaceHistogramData } from "@/lib/types";
import { formatTime } from "@/lib/format";

interface Props {
  data: RaceHistogramData;
  color: string;
  label: string;
}

const CHART_HEIGHT = 220;
const MARGIN = { top: 10, right: 10, bottom: 44, left: 45 };
const SVG_WIDTH = 500;

export default function RaceHistogram({ data, color, label }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    bin: (typeof data.bins)[0];
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.bins.length === 0) return null;

  const bins = data.bins;
  const maxCount = Math.max(...bins.map((b) => b.count));
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const plotWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;

  const yTicks = getYTicks(maxCount);
  const step = Math.max(1, Math.floor(bins.length / 8));

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
    const plotLeft = (MARGIN.left / SVG_WIDTH) * rect.width;
    const plotRight = rect.width - (MARGIN.right / SVG_WIDTH) * rect.width;
    const plotW = plotRight - plotLeft;
    const relX = x - plotLeft;
    if (relX < 0 || relX > plotW) {
      setTooltip(null);
      return;
    }
    const idx = Math.min(
      bins.length - 1,
      Math.floor((relX / plotW) * bins.length)
    );
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, bin: bins[idx] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400">{label}</span>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
          style={{ height: CHART_HEIGHT }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Y-axis grid + labels */}
          {yTicks.map((tick) => {
            const y = MARGIN.top + innerHeight - (tick / maxCount) * innerHeight;
            return (
              <g key={tick}>
                <line x1={MARGIN.left} y1={y} x2={SVG_WIDTH - MARGIN.right} y2={y} stroke="#374151" strokeWidth="0.5" />
                <text x={MARGIN.left - 5} y={y + 3} textAnchor="end" fill="#9ca3af" fontSize="11">{tick}</text>
              </g>
            );
          })}

          {/* Bars */}
          {bins.map((bin, i) => {
            const barH = maxCount > 0 ? (bin.count / maxCount) * innerHeight : 0;
            const x = MARGIN.left + (i / bins.length) * plotWidth;
            const bw = (plotWidth / bins.length) * 0.85;
            const y = MARGIN.top + innerHeight - barH;
            return (
              <rect key={i} x={x} y={y} width={bw} height={barH} rx="2" fill={color} fillOpacity={0.6} />
            );
          })}

          {/* Median reference line */}
          {medianBinIdx >= 0 && (
            <g>
              <line
                x1={MARGIN.left + ((medianBinIdx + 0.42) / bins.length) * plotWidth}
                y1={MARGIN.top}
                x2={MARGIN.left + ((medianBinIdx + 0.42) / bins.length) * plotWidth}
                y2={MARGIN.top + innerHeight}
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x={MARGIN.left + ((medianBinIdx + 0.42) / bins.length) * plotWidth}
                y={MARGIN.top - 2}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="11"
              >
                Median
              </text>
            </g>
          )}

          {/* X-axis tick labels */}
          {bins.map((bin, i) => {
            if (i % step !== 0) return null;
            const x = MARGIN.left + ((i + 0.42) / bins.length) * plotWidth;
            return (
              <text key={i} x={x} y={MARGIN.top + innerHeight + 16} textAnchor="middle" fill="#9ca3af" fontSize="11">
                {bin.label}
              </text>
            );
          })}

          {/* X-axis label */}
          <text
            x={MARGIN.left + plotWidth / 2}
            y={CHART_HEIGHT - 4}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="11"
          >
            Time
          </text>

          {/* Y-axis label */}
          <text
            x={12}
            y={MARGIN.top + innerHeight / 2}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="11"
            transform={`rotate(-90, 12, ${MARGIN.top + innerHeight / 2})`}
          >
            Athletes
          </text>
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
        {data.totalAthletes.toLocaleString()} athletes · Median: {formatTime(data.medianSeconds)}
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
