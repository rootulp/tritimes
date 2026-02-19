import Histogram from "./Histogram";
import { HistogramData } from "@/lib/types";

const COLORS: Record<string, string> = {
  Swim: "#3b82f6",
  Bike: "#ef4444",
  Run: "#f59e0b",
  Total: "#22c55e",
  T1: "#8b5cf6",
  T2: "#ec4899",
};

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
  const color = COLORS[discipline] || "#6b7280";
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
