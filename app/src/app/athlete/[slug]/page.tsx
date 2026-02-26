import { notFound } from "next/navigation";
import { getAthleteProfile } from "@/lib/data";
import { getCountryFlagISO } from "@/lib/flags";
import AthleteRaceList from "@/components/AthleteRaceList";

export async function generateStaticParams() {
  return [];
}

// Athlete data is static once scraped — cache rendered pages for 1 hour.
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AthletePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getAthleteProfile(slug);
  if (!profile) notFound();

  const flag = getCountryFlagISO(profile.countryISO);

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {flag && <span className="mr-2">{flag}</span>}
          {profile.fullName}
        </h1>
        <p className="text-gray-400 mt-1">
          {profile.country} &middot; {profile.races.length} {profile.races.length === 1 ? "race" : "races"}
        </p>
      </header>

      <AthleteRaceList slug={slug} fullName={profile.fullName} races={profile.races} />
    </main>
  );
}
