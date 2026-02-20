import Link from "next/link";
import { getStatsPageData } from "@/lib/data";

export const metadata = {
  title: "Stats | TriTimes",
  description:
    "Aggregate statistics across all IRONMAN and IRONMAN 70.3 races tracked by TriTimes.",
};

export default function StatsPage() {
  const stats = getStatsPageData();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Stats</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
          <p className="text-sm text-gray-400">Race Results</p>
          <p className="text-3xl font-bold text-white mt-1">
            {stats.totalResults.toLocaleString()}
          </p>
        </div>
        <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
          <p className="text-sm text-gray-400">Unique Athletes</p>
          <p className="text-3xl font-bold text-white mt-1">
            {stats.uniqueAthletes.toLocaleString()}
          </p>
        </div>
        <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
          <p className="text-sm text-gray-400">Races</p>
          <p className="text-3xl font-bold text-white mt-1">
            {stats.raceCount.toLocaleString()}
          </p>
        </div>
        <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
          <p className="text-sm text-gray-400">IRONMAN Courses</p>
          <p className="text-3xl font-bold text-white mt-1">
            {stats.ironmanCourseCount.toLocaleString()}
          </p>
        </div>
        <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
          <p className="text-sm text-gray-400">IRONMAN 70.3 Courses</p>
          <p className="text-3xl font-bold text-white mt-1">
            {stats.halfIronmanCourseCount.toLocaleString()}
          </p>
        </div>
        <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
          <p className="text-sm text-gray-400">Earliest Race</p>
          <Link
            href={`/race/${stats.earliestRace.slug}`}
            className="text-lg font-semibold text-white hover:text-blue-400 transition-colors mt-1 block"
          >
            {stats.earliestRace.name}
          </Link>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.earliestRace.date}
          </p>
        </div>
        <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
          <p className="text-sm text-gray-400">Most Recent Race</p>
          <Link
            href={`/race/${stats.mostRecentRace.slug}`}
            className="text-lg font-semibold text-white hover:text-blue-400 transition-colors mt-1 block"
          >
            {stats.mostRecentRace.name}
          </Link>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.mostRecentRace.date}
          </p>
        </div>
      </div>
    </main>
  );
}
