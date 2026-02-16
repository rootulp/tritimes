import { notFound } from "next/navigation";
import Link from "next/link";
import { getRaces, getRaceBySlug, getAllIds, getAthleteById, getDisciplineHistogram, getGenderCount, getAgeGroupCount, type Discipline } from "@/lib/data";
import ResultCard from "@/components/ResultCard";
import DisciplineSection from "@/components/DisciplineSection";

export async function generateStaticParams() {
  const races = getRaces();
  const params: { slug: string; id: string }[] = [];
  for (const race of races) {
    for (const id of getAllIds(race.slug)) {
      params.push({ slug: race.slug, id: String(id) });
    }
  }
  return params;
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

  const totalFinishers = getAllIds(slug).length;
  const genderTotal = getGenderCount(slug, athlete.gender);
  const ageGroupTotal = getAgeGroupCount(slug, athlete.ageGroup);

  const overallPct = Math.max(1, Math.round((athlete.overallRank / totalFinishers) * 100));
  const genderPct = Math.max(1, Math.round((athlete.genderRank / genderTotal) * 100));
  const ageGroupPct = Math.max(1, Math.round((athlete.ageGroupRank / ageGroupTotal) * 100));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-6 inline-block">
        &larr; Back to search
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{athlete.fullName}</h1>
        <p className="text-gray-600 mt-1">
          {race.name} &middot; Bib #{athlete.bib} &middot; {athlete.ageGroup} &middot;{" "}
          {[athlete.city, athlete.state, athlete.country].filter(Boolean).join(", ")}
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

      <div className="space-y-6">
        {histograms.map((h) => (
          <DisciplineSection
            key={h.key}
            discipline={h.label}
            time={h.time}
            overallData={h.overall}
            ageGroupData={h.ageGroup}
            ageGroup={athlete.ageGroup}
          />
        ))}
        {transitionHistograms.map((h) => (
          <DisciplineSection
            key={h.key}
            discipline={h.label}
            time={h.time}
            overallData={h.overall}
            ageGroupData={h.ageGroup}
            ageGroup={athlete.ageGroup}
          />
        ))}
      </div>
    </main>
  );
}
