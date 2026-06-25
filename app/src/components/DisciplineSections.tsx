"use client";

import { useState } from "react";
import DisciplineSection from "./DisciplineSection";
import PercentilePill from "./PercentilePill";
import { HistogramData } from "@/lib/types";
import { DISCIPLINE_COLORS, DEFAULT_DISCIPLINE_COLOR } from "@/lib/colors";

export interface DisciplineData {
  key: string;
  label: string;
  time: string;
  overall: HistogramData;
  ageGroup: HistogramData;
}

interface Props {
  disciplines: DisciplineData[];
  transitions: DisciplineData[];
  ageGroup: string;
}

export default function DisciplineSections({ disciplines, transitions, ageGroup }: Props) {
  const [showOverall, setShowOverall] = useState(false);
  const scopeLabel = showOverall ? "overall field" : "age group";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {disciplines.map((d) => (
          <div
            key={d.key}
            className="relative bg-gray-900 rounded-lg border border-gray-700 p-4 text-center"
          >
            <div className="absolute top-2 right-2">
              <PercentilePill
                percentile={(showOverall ? d.overall : d.ageGroup).athletePercentile}
                scopeLabel={scopeLabel}
              />
            </div>
            <div
              className="text-sm font-medium mb-1"
              style={{ color: DISCIPLINE_COLORS[d.label] || DEFAULT_DISCIPLINE_COLOR }}
            >
              {d.label}
            </div>
            <div className="text-lg font-mono font-bold text-white">{d.time}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-lg bg-gray-800 p-1">
          <button
            onClick={() => setShowOverall(false)}
            className={`px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
              !showOverall
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Age Group
          </button>
          <button
            onClick={() => setShowOverall(true)}
            className={`px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
              showOverall
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Overall Field
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {disciplines.map((d) => (
          <DisciplineSection
            key={d.key}
            discipline={d.label}
            time={d.time}
            overallData={d.overall}
            ageGroupData={d.ageGroup}
            ageGroup={ageGroup}
            scope={showOverall ? "overall" : "ageGroup"}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {transitions.map((d) => (
          <DisciplineSection
            key={d.key}
            discipline={d.label}
            time={d.time}
            overallData={d.overall}
            ageGroupData={d.ageGroup}
            ageGroup={ageGroup}
            scope={showOverall ? "overall" : "ageGroup"}
          />
        ))}
      </div>
    </div>
  );
}
