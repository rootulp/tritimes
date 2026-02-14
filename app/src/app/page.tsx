import Link from "next/link";
import { getRaces, getAllResults } from "@/lib/data";

export default function Home() {
  const races = getRaces();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-2">TriTimes</h1>
        <p className="text-lg text-gray-600">
          See how you performed relative to the field
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {races.map((race) => {
          const count = getAllResults(race.slug).length;
          return (
            <Link
              key={race.slug}
              href={`/race/${race.slug}`}
              className="block p-6 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
            >
              <h2 className="text-xl font-semibold text-gray-900">{race.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{race.location}</p>
              <p className="text-sm text-gray-400 mt-1">
                {race.date} &middot; {count} finishers
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
