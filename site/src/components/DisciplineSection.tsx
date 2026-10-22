import Histogram from "./Histogram";
import type { HistogramData } from "@/lib/types";
import { DISCIPLINE_COLORS, DEFAULT_DISCIPLINE_COLOR } from "@/lib/colors";

interface Props {
  discipline: string;
  time: string;
  overallData: HistogramData;
  ageGroupData: HistogramData;
  ageGroup: string;
  scope: "ageGroup" | "overall";
}

export default function DisciplineSection({
  discipline,
  time,
  overallData,
  ageGroupData,
  ageGroup,
  scope,
}: Props) {
  const color = DISCIPLINE_COLORS[discipline] || DEFAULT_DISCIPLINE_COLOR;
  const data = scope === "overall" ? overallData : ageGroupData;
  const label = scope === "overall" ? "Overall Field" : `Age Group: ${ageGroup}`;

  return (
    <section className="chart-card panel" aria-label={`${discipline} distribution`}>
      <div className="chart-heading">
        <h2><span aria-hidden="true" style={{ color }}>●</span> {discipline}</h2>
        <span>{time}</span>
      </div>
      <Histogram data={data} color={color} label={label} />
    </section>
  );
}
