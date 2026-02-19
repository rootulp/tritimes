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

function getDistanceLabel(slug: string): string {
  return slug.startsWith("im703-") ? "70.3" : "140.6";
}

function cleanRaceName(name: string): string {
  return name.replace(/^IRONMAN\s+70\.3\s+/i, "").replace(/^IRONMAN\s+/i, "");
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
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-white/10 text-white ring-1 ring-white/20 border-none appearance-none cursor-pointer pr-7 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M3%205l3%203%203-3%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat"
          >
            <option value="All" className="bg-gray-900 text-white">All</option>
            {years.map((y) => (
              <option key={y} value={y} className="bg-gray-900 text-white">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Showing {filtered.length} of {races.length} races
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((race) => {
          const flag = getCountryFlag(race.location);

          return (
            <Link
              key={race.slug}
              href={`/race/${race.slug}`}
              className="group block p-5 border border-gray-700/80 rounded-lg bg-gray-900 transition-colors duration-200 hover:border-gray-600 hover:bg-gray-800/80"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">
                  {cleanRaceName(race.name)}
                </h2>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-400">
                  {getDistanceLabel(race.slug)}
                </span>
              </div>

              <p className="text-sm text-gray-400 mt-2">
                {flag && <span className="mr-1.5">{flag}</span>}
                {race.location}
              </p>

              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <span>{formatDate(race.date)}</span>
                <span className="text-gray-700">&middot;</span>
                <span>{race.finishers.toLocaleString()} finishers</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
