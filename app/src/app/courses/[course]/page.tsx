import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseInfo } from "@/lib/races";
import {
  getRaceStats,
  getRaceSegmentData,
  getCourseResults,
  computeRaceStats,
  buildTopFinishers,
  getCourseYearSummary,
  buildRaceSegmentData,
} from "@/lib/data";
import type { LeaderboardEntry, CourseYearSummaryRow, RaceStats, RaceSegmentData } from "@/lib/types";
import { formatAthleteName, formatTime } from "@/lib/format";
import { getCountryFlagISO } from "@/lib/flags";
import ResultCard from "@/components/ResultCard";
import RaceDistributions from "@/components/RaceDistributions";
import { DISCIPLINE_COLORS } from "@/lib/colors";

// This page reads searchParams (?year=), which requires request-time rendering.
// A statically-generated route (generateStaticParams + revalidate=false, as
// /race/[slug] uses) throws DYNAMIC_SERVER_USAGE when it touches searchParams,
// so this route opts into dynamic rendering instead.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ course: string }>;
  searchParams: Promise<{ year?: string }>;
}

function genderColor(gender: string): string {
  if (gender === "Male") return "#3b82f6";
  if (gender === "Female") return "#ec4899";
  return "#6b7280";
}

function genderLabel(gender: string): string {
  return gender || "Unlisted";
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { course } = await params;
  const { year } = await searchParams;
  const info = getCourseInfo(course);
  if (!info) return {};

  const years = info.editions.map((e) => e.year);
  const span = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : years[0];
  const selected =
    typeof year === "string" && year && info.editions.some((e) => e.year === year)
      ? year
      : undefined;
  const canonical = selected ? `/courses/${course}?year=${selected}` : `/courses/${course}`;

  if (selected) {
    const title = `${info.name} ${selected} — Results & Time Distributions`;
    return { title, alternates: { canonical } };
  }
  const title = `${info.name} — All Editions`;
  const description = `Combined results across ${info.editions.length} editions (${span}) of ${info.name}: time distributions, discipline splits, and fastest finishers.`;
  return { title, description, alternates: { canonical } };
}

export default async function CoursePage({ params, searchParams }: PageProps) {
  const { course } = await params;
  const { year } = await searchParams;
  const info = getCourseInfo(course);
  if (!info) notFound();

  const selectedYear = typeof year === "string" && year ? year : undefined;
  const selectedEdition = selectedYear
    ? info.editions.find((e) => e.year === selectedYear)
    : undefined;
  if (selectedYear && !selectedEdition) notFound();

  let stats: RaceStats;
  let segmentData: RaceSegmentData;
  let yearSummary: CourseYearSummaryRow[] | null = null;
  const combined = !selectedEdition;

  if (selectedEdition) {
    stats = getRaceStats(selectedEdition.slug);
    segmentData = getRaceSegmentData(selectedEdition.slug);
  } else {
    const pool = getCourseResults(info.editions.map((e) => e.slug));
    stats = computeRaceStats(pool);
    stats.maleLeaderboard = buildTopFinishers(pool, "Male");
    stats.femaleLeaderboard = buildTopFinishers(pool, "Female");
    segmentData = buildRaceSegmentData(pool);
    yearSummary = getCourseYearSummary(pool);
  }

  const finishStats = stats.disciplines.find((d) => d.discipline === "Total");
  const years = info.editions.map((e) => e.year);
  const span = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : years[0];
  const singleSlug = selectedEdition?.slug;

  function resultHref(entry: LeaderboardEntry): string {
    const slug = entry.raceSlug ?? singleSlug ?? "";
    return `/race/${slug}/result/${entry.id}`;
  }

  const tagBase =
    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors";
  const tagActive = "bg-white/10 text-white ring-1 ring-white/20";
  const tagIdle = "text-gray-400 hover:text-white hover:bg-white/5";

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          {info.name}
          {selectedEdition ? ` ${selectedEdition.year}` : ""}
        </h1>
        <p className="text-gray-400 mt-1">
          {info.location && <>{info.location} &middot; </>}
          {combined
            ? `${info.editions.length} edition${info.editions.length !== 1 ? "s" : ""}${info.editions.length > 1 ? ` · ${span}` : ""}`
            : selectedEdition!.date}
        </p>
      </header>

      {/* Year tags. `replace` keeps the URL shareable while switching years
          without stacking a browser-history entry per click, so one Back
          returns to the previous page instead of stepping through each year. */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <Link href={`/courses/${course}`} replace className={`${tagBase} ${combined ? tagActive : tagIdle}`}>
          All years
        </Link>
        {info.editions.map((e) => (
          <Link
            key={e.slug}
            href={`/courses/${course}?year=${e.year}`}
            replace
            className={`${tagBase} ${selectedYear === e.year ? tagActive : tagIdle}`}
          >
            {e.year}
          </Link>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <ResultCard label="Finishers" value={stats.totalFinishers.toLocaleString()} />
        <ResultCard label="Median Finish" value={finishStats ? formatTime(finishStats.median) : "—"} />
        <ResultCard label="Fastest Finish" value={finishStats ? formatTime(finishStats.fastest) : "—"} />
        <ResultCard label="Slowest Finish" value={finishStats ? formatTime(finishStats.slowest) : "—"} />
      </div>

      {/* Discipline breakdown */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Discipline Breakdown</h2>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
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
        <RaceDistributions data={segmentData} />
      </section>

      {/* Demographics */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Demographics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Gender Split</h3>
            <div className="flex rounded-full overflow-hidden h-3 mb-4">
              {stats.genderBreakdown.map((g) => (
                <div
                  key={g.gender || "_unlisted"}
                  className="h-full"
                  style={{ width: `${g.percentage}%`, backgroundColor: genderColor(g.gender) }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {stats.genderBreakdown.map((g) => (
                <div key={g.gender || "_unlisted"} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: genderColor(g.gender) }} />
                    <span className="text-white">{genderLabel(g.gender)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span>{g.count.toLocaleString()} ({g.percentage}%)</span>
                    <span className="font-mono">{formatTime(g.medianFinish)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                      <div className="h-full rounded-sm bg-blue-500/40" style={{ width: `${barWidth}%` }} />
                    </div>
                    <span className="text-gray-400 w-12 text-right shrink-0">{ag.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Top finishers */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">
          {combined ? "Fastest Finishers (All Editions)" : "Top Finishers"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "Top 10 Males", entries: stats.maleLeaderboard },
            { title: "Top 10 Females", entries: stats.femaleLeaderboard },
          ].map(({ title, entries }) => (
            <div key={title} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-400 px-4 pt-4 pb-2">{title}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left px-4 py-2 font-medium w-8">#</th>
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    {combined && <th className="text-left px-4 py-2 font-medium">Year</th>}
                    <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">AG</th>
                    <th className="text-right px-4 py-2 font-medium">Finish</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const flag = getCountryFlagISO(entry.countryISO);
                    return (
                      <tr key={`${entry.raceSlug ?? ""}-${entry.id}`} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50">
                        <td className="px-4 py-2 text-gray-400">{entry.rank}</td>
                        <td className="px-4 py-2">
                          <Link href={resultHref(entry)} className="text-white hover:text-blue-400 transition-colors">
                            {flag} {formatAthleteName(entry.fullName)}
                          </Link>
                        </td>
                        {combined && <td className="px-4 py-2 text-gray-400">{entry.year}</td>}
                        <td className="px-4 py-2 text-gray-400 hidden lg:table-cell">{entry.ageGroup}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-white">{entry.finishTime}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* All editions */}
      {combined && yearSummary && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">All Editions</h2>
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">Year</th>
                  <th className="text-right px-4 py-3 font-medium">Finishers</th>
                  <th className="text-right px-4 py-3 font-medium">Median Finish</th>
                </tr>
              </thead>
              <tbody>
                {yearSummary.map((row) => (
                  <tr key={row.slug} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/race/${row.slug}`} className="text-white hover:text-blue-400 transition-colors">
                        {row.year}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.finishers.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">
                      {row.medianFinish > 0 ? formatTime(row.medianFinish) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
