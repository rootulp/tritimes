"use client";

import { useState } from "react";
import DisciplineSection from "./DisciplineSection";
import { HistogramData } from "@/lib/types";

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

  return (
    <div className="space-y-6">
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
  );
}
