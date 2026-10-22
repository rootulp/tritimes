import { useState } from "preact/hooks";
import DisciplineSection from "./DisciplineSection";
import PercentilePill from "./PercentilePill";
import type { HistogramData } from "@/lib/types";
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
    <div className="space-y-5">
      <div className="comparison-toolbar">
        <div><h2 className="text-xl font-semibold tracking-tight">Your splits, in context</h2><p className="text-sm text-secondary">Comparing with <strong>{showOverall ? "the overall field" : ageGroup}</strong>. Lower “Top %” means a higher placing.</p></div>
        <div className="scope-toggle" role="group" aria-label="Comparison field">
          <button type="button" aria-pressed={!showOverall} onClick={() => setShowOverall(false)}>Age Group</button>
          <button type="button" aria-pressed={showOverall} onClick={() => setShowOverall(true)}>Overall Field</button>
        </div>
      </div>
      <div className="split-grid">
        {disciplines.map((d) => (
          <div key={d.key} className="split-card panel">
            <div className="split-card-title">
              <span className="text-sm font-semibold" style={{ color: DISCIPLINE_COLORS[d.label] || DEFAULT_DISCIPLINE_COLOR }}>{d.label}</span>
              <PercentilePill percentile={(showOverall ? d.overall : d.ageGroup).athletePercentile} scopeLabel={scopeLabel} />
            </div>
            <div className="split-card-time">{d.time || "—"}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disciplines.map((d) => (
          <DisciplineSection key={d.key} discipline={d.label} time={d.time} overallData={d.overall} ageGroupData={d.ageGroup} ageGroup={ageGroup} scope={showOverall ? "overall" : "ageGroup"} />
        ))}
      </div>
      <details className="transition-details">
        <summary>Transition details <span className="text-sm text-secondary font-normal ml-2">T1 &amp; T2</span></summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transitions.map((d) => (
            <DisciplineSection key={d.key} discipline={d.label} time={d.time} overallData={d.overall} ageGroupData={d.ageGroup} ageGroup={ageGroup} scope={showOverall ? "overall" : "ageGroup"} />
          ))}
        </div>
      </details>
    </div>
  );
}
