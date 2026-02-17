import Link from "next/link";
import { getGlobalStats } from "@/lib/data";
import GlobalSearchBar from "@/components/GlobalSearchBar";

export default function Home() {
  const stats = getGlobalStats();

  return (
    <main className="min-h-screen">
      {/* Hero section */}
      <section className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-[#0a0a0a] to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-28 pb-20">
          <h1 className="text-6xl sm:text-7xl font-bold text-white tracking-tight mb-4">
            Race. Compare.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Improve.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-xl mb-10 leading-relaxed">
            Explore your IronMan &amp; 70.3 results with full field distributions.
            See where you stand in swim, bike, run, and overall.
          </p>

          <div className="w-full max-w-lg mb-4">
            <GlobalSearchBar />
          </div>

          <Link
            href="/races"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            or browse all races &rarr;
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-white">{stats.raceCount}</div>
            <div className="text-sm text-gray-500 mt-1">Races</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">
              {stats.totalResults.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">Results</div>
          </div>
        </div>
      </section>
    </main>
  );
}
