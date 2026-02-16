import Link from "next/link";
import { getRaces, getAllResults } from "@/lib/data";

export default function RacesPage() {
  const races = getRaces();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">All Races</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {races.map((race) => {
          const count = getAllResults(race.slug).length;
          return (
            <Link
              key={race.slug}
              href={`/race/${race.slug}`}
              className="block p-6 border border-gray-700 rounded-lg hover:border-blue-400 hover:shadow-md transition-all bg-gray-900"
            >
              <h2 className="text-xl font-semibold text-white">{race.name}</h2>
              <p className="text-sm text-gray-400 mt-1">{race.location}</p>
              <p className="text-sm text-gray-500 mt-1">
                {race.date} &middot; {count} finishers
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
