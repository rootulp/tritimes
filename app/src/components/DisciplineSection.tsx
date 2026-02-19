import Histogram from "./Histogram";
import { HistogramData } from "@/lib/types";
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
    <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-white">{discipline}</h2>
        <span className="text-lg text-gray-400">{time}</span>
      </div>
      <Histogram data={data} color={color} label={label} />
    </section>
  );
}
