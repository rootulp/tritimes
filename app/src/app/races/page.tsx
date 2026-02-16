import Link from "next/link";
import { getRaces } from "@/lib/data";
import { getCountryFlag } from "@/lib/flags";

function formatDate(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDistanceInfo(slug: string): { label: string; color: string; accent: string } {
  if (slug.startsWith("im703-")) {
    return {
      label: "70.3",
      color: "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30",
      accent: "border-l-blue-500",
    };
  }
  return {
    label: "140.6",
    color: "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30",
    accent: "border-l-orange-500",
  };
}

export default function RacesPage() {
  const races = getRaces();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">All Races</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {races.map((race) => {
          const distance = getDistanceInfo(race.slug);
          const flag = getCountryFlag(race.location);

          return (
            <Link
              key={race.slug}
              href={`/race/${race.slug}`}
              className={`group block p-5 border border-gray-700/80 border-l-4 ${distance.accent} rounded-lg bg-gray-900 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">
                  {race.name}
                </h2>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${distance.color}`}>
                  {distance.label}
                </span>
              </div>

              <p className="text-sm text-gray-400 mt-2">
                {flag && <span className="mr-1.5">{flag}</span>}
                {race.location}
              </p>

              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                <span>{formatDate(race.date)}</span>
                <span className="text-gray-700">&middot;</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {race.finishers.toLocaleString()} finishers
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
