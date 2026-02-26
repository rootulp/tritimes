import { notFound } from "next/navigation";
import Link from "next/link";
import { getRaceBySlug, getAthleteById, getDisciplineHistogram, getGenderCount, getAgeGroupCount, getAllResults, type Discipline } from "@/lib/data";
import dynamic from "next/dynamic";
import ResultCard from "@/components/ResultCard";
import { getCountryFlagISO } from "@/lib/flags";

const DisciplineSections = dynamic(
  () => import("@/components/DisciplineSections"),
  {
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-center"><div className="h-10 w-56 bg-gray-800 rounded-lg" /></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <div className="h-5 w-24 bg-gray-800 rounded mb-4" />
            <div className="h-48 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    ),
  }
);
import { DISCIPLINE_COLORS, DEFAULT_DISCIPLINE_COLOR } from "@/lib/colors";

// Don't pre-render all 75K+ athlete pages at build time — generate on demand.
// Next.js will render on first request and cache for subsequent visits.
export async function generateStaticParams() {
  return [];
}

// Race data is static once scraped — cache rendered pages for 1 hour.
export const revalidate = 3600;

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

  const totalFinishers = getAllResults(slug).length;
  const genderTotal = getGenderCount(slug, athlete.gender);
  const ageGroupTotal = getAgeGroupCount(slug, athlete.ageGroup);

  const overallPct = Math.max(1, Math.round((athlete.overallRank / totalFinishers) * 100));
  const genderPct = Math.max(1, Math.round((athlete.genderRank / genderTotal) * 100));
  const ageGroupPct = Math.max(1, Math.round((athlete.ageGroupRank / ageGroupTotal) * 100));

  const flag = getCountryFlagISO(athlete.countryISO);
  const location = [athlete.city, athlete.state, athlete.country].filter(Boolean).join(", ");


  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {flag && <span className="mr-2">{flag}</span>}
          {athlete.fullName}
        </h1>
        <p className="text-gray-400 mt-1">
          <Link href={`/race/${slug}`} className="text-blue-400 hover:underline">{race.name}</Link> &middot; Bib #{athlete.bib} &middot; {athlete.ageGroup} &middot; {location}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
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
        {disciplines.map((d) => (
          <div
            key={d.key}
            className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center"
          >
            <div className="text-sm font-medium mb-1" style={{ color: DISCIPLINE_COLORS[d.label] || DEFAULT_DISCIPLINE_COLOR }}>
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
    </main>
  );
}
