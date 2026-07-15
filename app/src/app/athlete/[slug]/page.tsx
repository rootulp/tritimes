import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAthleteProfile } from "@/lib/athlete-shards";
import { getCountryFlagISO } from "@/lib/flags";
import { formatAthleteName } from "@/lib/format";
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

// The duplicate getAthleteProfile call (metadata + page) is served from the
// in-memory shard cache, so it costs one shard fetch, not two.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getAthleteProfile(slug);
  if (!profile) return {};

  const name = formatAthleteName(profile.fullName);
  const raceCount = profile.races.length;
  const title = `${name} — Triathlon Race History`;
  const description = `${name}${profile.country ? ` (${profile.country})` : ""} has ${raceCount} IRONMAN and IRONMAN 70.3 ${raceCount === 1 ? "result" : "results"} on TriTimes. View finish times, splits, and percentiles for every race.`;

  return {
    title,
    description,
    alternates: { canonical: `/athlete/${slug}` },
    openGraph: { title, description, url: `/athlete/${slug}` },
  };
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
          {formatAthleteName(profile.fullName)}
        </h1>
        <p className="text-gray-400 mt-1">
          {profile.country} &middot; {profile.races.length} {profile.races.length === 1 ? "race" : "races"}
        </p>
      </header>

      <AthleteRaceList slug={slug} fullName={profile.fullName} races={profile.races} />
    </main>
  );
}
