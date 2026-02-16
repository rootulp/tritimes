import Histogram from "./Histogram";
import { HistogramData } from "@/lib/types";

const COLORS: Record<string, string> = {
  Swim: "#3b82f6",
  Bike: "#22c55e",
  Run: "#f59e0b",
  Total: "#ef4444",
  "T1 (Swim → Bike)": "#8b5cf6",
  "T2 (Bike → Run)": "#ec4899",
};

interface Props {
  discipline: string;
  time: string;
  overallData: HistogramData;
  ageGroupData: HistogramData;
  ageGroup: string;
}

export default function DisciplineSection({
  discipline,
  time,
  overallData,
  ageGroupData,
  ageGroup,
}: Props) {
  const color = COLORS[discipline] || "#6b7280";

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{discipline}</h2>
        <span className="text-lg text-gray-600">{time}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Histogram data={overallData} color={color} label="Overall Field" />
        <Histogram data={ageGroupData} color={color} label={`Age Group: ${ageGroup}`} />
      </div>
    </section>
  );
}
