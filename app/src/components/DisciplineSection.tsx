import Histogram from "./Histogram";
import { HistogramData } from "@/lib/types";

const COLORS: Record<string, string> = {
  Swim: "#3b82f6",
  Bike: "#22c55e",
  Run: "#f59e0b",
  Total: "#ef4444",
};

const TRANSITION_COLOR = "#9ca3af";

interface Props {
  discipline: string;
  time: string;
  overallData: HistogramData;
  ageGroupData: HistogramData;
  ageGroup: string;
  compact?: boolean;
}

export default function DisciplineSection({
  discipline,
  time,
  overallData,
  ageGroupData,
  ageGroup,
  compact,
}: Props) {
  const color = COLORS[discipline] || TRANSITION_COLOR;

  if (compact) {
    return (
      <section className="bg-gray-50 rounded-lg border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{discipline}</h3>
          <span className="text-sm text-gray-500">{time}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Histogram data={overallData} color={color} label="Overall Field" compact />
          <Histogram data={ageGroupData} color={color} label={`Age Group: ${ageGroup}`} compact />
        </div>
      </section>
    );
  }

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
