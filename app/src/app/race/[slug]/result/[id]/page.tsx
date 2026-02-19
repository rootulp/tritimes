import { notFound } from "next/navigation";
import Link from "next/link";
import { getRaceBySlug, getAthleteById, getDisciplineHistogram, getGenderCount, getAgeGroupCount, getAllResults, type Discipline } from "@/lib/data";
import ResultCard from "@/components/ResultCard";
import DisciplineSections from "@/components/DisciplineSections";
import { getCountryFlagISO } from "@/lib/flags";

// Don't pre-render all 75K+ athlete pages at build time — generate on demand.
// Next.js will render on first request and cache for subsequent visits.
export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ResultPage({ params }: PageProps) {
  const { slug, id } = await params;
  const race = getRaceBySlug(slug);
  if (!race) notFound();

  const athlete = getAthleteById(slug, Number(id));
  if (!athlete) notFound();

  const disciplines: { key: Discipline; label: string; time: string }[] = [
    { key: "swim", label: "Swim", time: athlete.swimTime },
    { key: "bike", label: "Bike", time: athlete.bikeTime },
    { key: "run", label: "Run", time: athlete.runTime },
    { key: "finish", label: "Total", time: athlete.finishTime },
  ];

  const transitions: { key: Discipline; label: string; time: string }[] = [
    { key: "t1", label: "T1 (Swim → Bike)", time: athlete.t1Time },
    { key: "t2", label: "T2 (Bike → Run)", time: athlete.t2Time },
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

  const totalFinishers = getAllResults(slug).length;
  const genderTotal = getGenderCount(slug, athlete.gender);
  const ageGroupTotal = getAgeGroupCount(slug, athlete.ageGroup);

  const overallPct = Math.max(1, Math.round((athlete.overallRank / totalFinishers) * 100));
  const genderPct = Math.max(1, Math.round((athlete.genderRank / genderTotal) * 100));
  const ageGroupPct = Math.max(1, Math.round((athlete.ageGroupRank / ageGroupTotal) * 100));

  const flag = getCountryFlagISO(athlete.countryISO);
  const location = [athlete.city, athlete.state, athlete.country].filter(Boolean).join(", ");

  const DISCIPLINE_COLORS: Record<string, string> = {
    Swim: "#3b82f6",
    Bike: "#22c55e",
    Run: "#f59e0b",
    Total: "#ef4444",
  };

  const medianComparisons = histograms.map((d) => {
    const athleteSec = d.overall.athleteSeconds;
    const medianSec = d.overall.medianSeconds;
    const deltaSec = athleteSec - medianSec;
    const faster = deltaSec < 0;
    return {
      label: d.label,
      time: d.time,
      medianSeconds: medianSec,
      deltaSec,
      faster,
      color: DISCIPLINE_COLORS[d.label] || "#6b7280",
    };
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/race/${slug}`} className="text-blue-400 hover:underline text-sm mb-6 inline-block">
        &larr; Back to search
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {flag && <span className="mr-2">{flag}</span>}
          {athlete.fullName}
        </h1>
        <p className="text-gray-400 mt-1">
          {race.name} &middot; Bib #{athlete.bib} &middot; {athlete.ageGroup} &middot; {location}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ResultCard
          label="Finish Time"
          value={athlete.finishTime}
        />
        <ResultCard
          label="Overall"
          value={`Top ${overallPct}%`}
          subtext={`${athlete.overallRank} of ${totalFinishers}`}
        />
        <ResultCard
          label="Gender"
          value={`Top ${genderPct}%`}
          subtext={`${athlete.genderRank} of ${genderTotal}`}
        />
        <ResultCard
          label="Age Group"
          value={`Top ${ageGroupPct}%`}
          subtext={`${athlete.ageGroupRank} of ${ageGroupTotal} · ${athlete.ageGroup}`}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {medianComparisons.map((d) => {
          const absDelta = Math.abs(d.deltaSec);
          const h = Math.floor(absDelta / 3600);
          const m = Math.floor((absDelta % 3600) / 60);
          const s = Math.round(absDelta % 60);
          const deltaStr = h > 0
            ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            : `${m}:${String(s).padStart(2, "0")}`;

          return (
            <div
              key={d.label}
              className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center"
            >
              <div className="text-sm font-medium mb-1" style={{ color: d.color }}>
                {d.label}
              </div>
              <div className="text-lg font-mono font-bold text-white">{d.time}</div>
              <div className={`text-sm font-mono mt-1 ${d.faster ? "text-green-400" : "text-red-400"}`}>
                {d.faster ? "-" : "+"}{deltaStr} vs median
              </div>
            </div>
          );
        })}
      </div>

      <DisciplineSections
        disciplines={histograms}
        transitions={transitionHistograms}
        ageGroup={athlete.ageGroup}
      />
    </main>
  );
}
