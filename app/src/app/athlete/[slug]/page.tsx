import { notFound } from "next/navigation";
import Link from "next/link";
import { getAthleteProfile } from "@/lib/data";
import { getCountryFlagISO } from "@/lib/flags";

export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AthletePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getAthleteProfile(slug);
  if (!profile) notFound();

  const flag = getCountryFlagISO(profile.countryISO);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-blue-400 hover:underline text-sm mb-6 inline-block">
        &larr; Back to search
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {flag && <span className="mr-2">{flag}</span>}
          {profile.fullName}
        </h1>
        <p className="text-gray-400 mt-1">
          {profile.country} &middot; {profile.races.length} {profile.races.length === 1 ? "race" : "races"}
        </p>
      </header>

      <div className="space-y-4">
        {profile.races.map((race) => (
          <Link
            key={`${race.raceSlug}-${race.resultId}`}
            href={`/race/${race.raceSlug}/result/${race.resultId}`}
            className="block bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{race.raceName}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {race.raceDate} &middot; {race.ageGroup}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono text-white">{race.finishTime}</div>
                <div className="text-xs font-mono text-gray-500 mt-1">
                  <span className="text-blue-400">{race.swimTime}</span>
                  {" / "}
                  <span className="text-green-400">{race.bikeTime}</span>
                  {" / "}
                  <span className="text-amber-400">{race.runTime}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
