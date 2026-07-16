import type { Metadata } from "next";
import { Suspense } from "react";
import { getRaces, getGlobalStats } from "@/lib/races";
import RaceList from "./race-list";

export const revalidate = false;

export function generateMetadata(): Metadata {
  const { raceCount, totalResults } = getGlobalStats();
  const description = `Browse ${raceCount.toLocaleString()} IRONMAN and IRONMAN 70.3 races with ${totalResults.toLocaleString()} finisher results. Filter by distance and year, then dive into time distributions for any race.`;

  return {
    title: "All IRONMAN & 70.3 Races",
    description,
    alternates: { canonical: "/races" },
    openGraph: { title: "All IRONMAN & 70.3 Races", description, url: "/races" },
  };
}

export default function RacesPage() {
  const races = getRaces();

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">All Races</h1>
      <Suspense fallback={null}>
        <RaceList races={races} />
      </Suspense>
    </main>
  );
}
