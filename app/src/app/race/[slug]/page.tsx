import { notFound } from "next/navigation";
import Link from "next/link";
import { getRaceBySlug, getRaceStats } from "@/lib/data";
import { formatTime } from "@/lib/format";
import { getCountryFlagISO } from "@/lib/flags";
import ResultCard from "@/components/ResultCard";
import RaceHistogram from "@/components/RaceHistogram";

// Generate on demand — too many races to pre-render at build time.
export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

const DISCIPLINE_COLORS: Record<string, string> = {
  Swim: "#3b82f6",
  Bike: "#ef4444",
  Run: "#f59e0b",
  Total: "#22c55e",
};

export default async function RacePage({ params }: PageProps) {
  const { slug } = await params;
  const race = getRaceBySlug(slug);
  if (!race) notFound();

  const stats = getRaceStats(slug);

  const finishStats = stats.disciplines.find((d) => d.discipline === "Total");

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/races" className="text-blue-400 hover:underline text-sm mb-6 inline-block">
        &larr; All races
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">{race.name}</h1>
        <p className="text-gray-400 mt-1">
          {race.date} &middot; {race.location}
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <ResultCard label="Finishers" value={stats.totalFinishers.toLocaleString()} />
        <ResultCard label="Median Finish" value={finishStats ? formatTime(finishStats.median) : "—"} />
        <ResultCard label="Fastest Finish" value={finishStats ? formatTime(finishStats.fastest) : "—"} />
        <ResultCard label="Slowest Finish" value={finishStats ? formatTime(finishStats.slowest) : "—"} />
      </div>

      {/* Discipline breakdown table */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Discipline Breakdown</h2>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Discipline</th>
                <th className="text-right px-4 py-3 font-medium">Fastest</th>
                <th className="text-right px-4 py-3 font-medium">Median</th>
                <th className="text-right px-4 py-3 font-medium">Average</th>
                <th className="text-right px-4 py-3 font-medium">Slowest</th>
              </tr>
            </thead>
            <tbody>
              {stats.disciplines.map((d) => (
                <tr key={d.discipline} className="border-b border-gray-800 last:border-b-0">
                  <td className="px-4 py-3 font-medium" style={{ color: DISCIPLINE_COLORS[d.discipline] }}>
                    {d.discipline}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">{formatTime(d.fastest)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{formatTime(d.median)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{formatTime(d.average)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{formatTime(d.slowest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Time distributions */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Time Distributions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(["swim", "bike", "run", "finish"] as const).map((key) => {
            const label = key === "finish" ? "Total" : key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                <RaceHistogram
                  data={stats.histograms[key]}
                  color={DISCIPLINE_COLORS[label]}
                  label={`${label} Distribution`}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Demographics */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Demographics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gender split */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Gender Split</h3>
            {/* Horizontal bar */}
            <div className="flex rounded-full overflow-hidden h-3 mb-4">
              {stats.genderBreakdown.map((g) => (
                <div
                  key={g.gender}
                  className="h-full"
                  style={{
                    width: `${g.percentage}%`,
                    backgroundColor: g.gender === "Male" ? "#3b82f6" : "#ec4899",
                  }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {stats.genderBreakdown.map((g) => (
                <div key={g.gender} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: g.gender === "Male" ? "#3b82f6" : "#ec4899" }}
                    />
                    <span className="text-white">{g.gender}</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span>{g.count.toLocaleString()} ({g.percentage}%)</span>
                    <span className="font-mono">{formatTime(g.medianFinish)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Age group breakdown */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Age Groups</h3>
            <div className="space-y-2">
              {stats.ageGroupBreakdown.map((ag) => {
                const maxCount = stats.ageGroupBreakdown[0]?.count || 1;
                const barWidth = Math.max(4, (ag.count / maxCount) * 100);
                return (
                  <div key={ag.ageGroup} className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-gray-400 shrink-0">{ag.ageGroup}</span>
                    <div className="flex-1 h-4 bg-gray-800 rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm bg-blue-500/40"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-gray-400 w-12 text-right shrink-0">{ag.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Top Finishers</h2>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">AG</th>
                <th className="text-right px-4 py-3 font-medium">Finish</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Swim</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Bike</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Run</th>
              </tr>
            </thead>
            <tbody>
              {stats.leaderboard.map((entry) => {
                const flag = getCountryFlagISO(entry.countryISO);
                return (
                  <tr key={entry.id} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-400">{entry.rank}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/race/${slug}/result/${entry.id}`}
                        className="text-white hover:text-blue-400 transition-colors"
                      >
                        {flag} {entry.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{entry.ageGroup}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">{entry.finishTime}</td>
                    <td className="px-4 py-3 text-right font-mono hidden md:table-cell" style={{ color: "#3b82f6" }}>{entry.swimTime}</td>
                    <td className="px-4 py-3 text-right font-mono hidden md:table-cell" style={{ color: "#ef4444" }}>{entry.bikeTime}</td>
                    <td className="px-4 py-3 text-right font-mono hidden md:table-cell" style={{ color: "#f59e0b" }}>{entry.runTime}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
