import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllIds, getAthleteById, getDisciplineHistogram, type Discipline } from "@/lib/data";
import ResultCard from "@/components/ResultCard";
import DisciplineSection from "@/components/DisciplineSection";

export async function generateStaticParams() {
  return getAllIds().map((id) => ({ id: String(id) }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const athlete = getAthleteById(Number(id));
  if (!athlete) notFound();

  const disciplines: { key: Discipline; label: string; time: string }[] = [
    { key: "swim", label: "Swim", time: athlete.swimTime },
    { key: "bike", label: "Bike", time: athlete.bikeTime },
    { key: "run", label: "Run", time: athlete.runTime },
    { key: "finish", label: "Total", time: athlete.finishTime },
  ];

  const histograms = disciplines.map((d) => ({
    ...d,
    overall: getDisciplineHistogram(athlete, d.key, "overall"),
    ageGroup: getDisciplineHistogram(athlete, d.key, "ageGroup"),
  }));

  const totalFinishers = getAllIds().length;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-6 inline-block">
        &larr; Back to search
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{athlete.fullName}</h1>
        <p className="text-gray-600 mt-1">
          Bib #{athlete.bib} &middot; {athlete.ageGroup} &middot;{" "}
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
          value={`${athlete.overallRank}`}
          subtext={`of ${totalFinishers}`}
        />
        <ResultCard
          label="Gender"
          value={`${athlete.genderRank}`}
        />
        <ResultCard
          label="Age Group"
          value={`${athlete.ageGroupRank}`}
          subtext={athlete.ageGroup}
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
      </div>
    </main>
  );
}
