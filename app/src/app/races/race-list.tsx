"use client";

import { useState } from "react";
import Link from "next/link";
import type { RaceInfo } from "@/lib/types";
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

function getYear(date: string): string {
  return date.slice(0, 4);
}

export default function RaceList({ races }: { races: RaceInfo[] }) {
  const [distance, setDistance] = useState<string>("All");
  const [year, setYear] = useState<string>("All");

  const years = [...new Set(races.map((r) => getYear(r.date)))].sort().reverse();

  const filtered = races.filter((race) => {
    if (distance === "70.3" && !race.slug.startsWith("im703-")) return false;
    if (distance === "140.6" && race.slug.startsWith("im703-")) return false;
    if (year !== "All" && getYear(race.date) !== year) return false;
    return true;
  });

  const btnClass = (active: boolean) =>
    active
      ? "px-3 py-1.5 rounded-full text-sm font-medium bg-white/10 text-white ring-1 ring-white/20"
      : "px-3 py-1.5 rounded-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors";

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Distance</span>
          {["All", "70.3", "140.6"].map((d) => (
            <button key={d} onClick={() => setDistance(d)} className={btnClass(distance === d)}>
              {d}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Year</span>
          <button onClick={() => setYear("All")} className={btnClass(year === "All")}>
            All
          </button>
          {years.map((y) => (
            <button key={y} onClick={() => setYear(y)} className={btnClass(year === y)}>
              {y}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Showing {filtered.length} of {races.length} races
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((race) => {
          const dist = getDistanceInfo(race.slug);
          const flag = getCountryFlag(race.location);

          return (
            <Link
              key={race.slug}
              href={`/race/${race.slug}`}
              className={`group block p-5 border border-gray-700/80 border-l-4 ${dist.accent} rounded-lg bg-gray-900 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">
                  {race.name}
                </h2>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${dist.color}`}>
                  {dist.label}
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
    </>
  );
}
