import { notFound } from "next/navigation";
import { getAthleteProfile } from "@/lib/athlete-shards";
import { getCountryFlagISO } from "@/lib/flags";
import AthleteRaceList from "@/components/AthleteRaceList";

// Edge runtime: near-zero cold start, eliminating the ~3.8s Node lambda
// cold-boot floor. The Edge runtime supports no static generation/ISR, so the
// page renders dynamically on every request — cheaper than a Node cold boot,
// since the per-request work is one CDN-cached shard fetch plus a small
// render. Everything in this route's import graph must stay edge-compatible —
// Web APIs only, no fs/zlib (see @/lib/athlete-shards).
export const runtime = "edge";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AthletePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await getAthleteProfile(slug);
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
