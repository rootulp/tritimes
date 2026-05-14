import dynamic from "next/dynamic";
import {
  getDisciplineHistogram,
  preloadHistograms,
  type Discipline,
} from "@/lib/data";
import type { AthleteResult } from "@/lib/types";
import { DISCIPLINE_COLORS, DEFAULT_DISCIPLINE_COLOR } from "@/lib/colors";
import PercentilePill from "./PercentilePill";

const DisciplineSections = dynamic(() => import("./DisciplineSections"));

interface Props {
  slug: string;
  athlete: AthleteResult;
}

export default async function HistogramSection({ slug, athlete }: Props) {
  // Awaited I/O gives the React renderer a yield point: the parent server
  // component flushes its HTML to the browser before histogram work runs.
  await preloadHistograms(slug);

  const disciplines: { key: Discipline; label: string; time: string }[] = [
    { key: "swim", label: "Swim", time: athlete.swimTime },
    { key: "bike", label: "Bike", time: athlete.bikeTime },
    { key: "run", label: "Run", time: athlete.runTime },
    { key: "finish", label: "Total", time: athlete.finishTime },
  ];

  const transitions: { key: Discipline; label: string; time: string }[] = [
    { key: "t1", label: "T1", time: athlete.t1Time },
    { key: "t2", label: "T2", time: athlete.t2Time },
  ];

  const histograms = disciplines.map((d) => ({
    ...d,
    overall: getDisciplineHistogram(slug, athlete, d.key, "overall"),
    ageGroup: getDisciplineHistogram(slug, athlete, d.key, "ageGroup"),
  }));

  const transitionHistograms = transitions.map((d) => ({
    ...d,
    overall: getDisciplineHistogram(slug, athlete, d.key, "overall"),
    ageGroup: getDisciplineHistogram(slug, athlete, d.key, "ageGroup"),
  }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {histograms.map((d) => (
          <div
            key={d.key}
            className="relative bg-gray-900 rounded-lg border border-gray-700 p-4 text-center"
          >
            <div className="absolute top-2 right-2">
              <PercentilePill percentile={d.ageGroup.athletePercentile} />
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

      <DisciplineSections
        disciplines={histograms}
        transitions={transitionHistograms}
        ageGroup={athlete.ageGroup}
      />
    </>
  );
}

export function HistogramSectionFallback() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center animate-pulse"
          >
            <div className="h-4 w-12 bg-gray-800 rounded mx-auto mb-2" />
            <div className="h-6 w-20 bg-gray-800 rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-6 animate-pulse" aria-hidden>
        <div className="flex justify-center">
          <div className="h-10 w-56 bg-gray-800 rounded-lg" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <div className="h-5 w-24 bg-gray-800 rounded mb-4" />
            <div className="h-48 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </>
  );
}
