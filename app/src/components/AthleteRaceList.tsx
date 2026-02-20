"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AthleteRaceEntry } from "@/lib/types";
import AthletePerformanceCharts from "./AthletePerformanceCharts";

interface Props {
  slug: string;
  fullName: string;
  races: AthleteRaceEntry[];
}

function raceKey(race: AthleteRaceEntry): string {
  return `${race.raceSlug}:${race.resultId}`;
}

function storageKey(slug: string): string {
  return `tritimes:hidden-races:${slug}`;
}

function loadHidden(slug: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveHidden(slug: string, hidden: Set<string>) {
  try {
    if (hidden.size === 0) {
      localStorage.removeItem(storageKey(slug));
    } else {
      localStorage.setItem(storageKey(slug), JSON.stringify([...hidden]));
    }
  } catch {}
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(fullName: string, races: AthleteRaceEntry[]) {
  const headers = [
    "Race",
    "Date",
    "Distance",
    "Age Group",
    "Swim",
    "Bike",
    "Run",
    "Finish",
    "Percentile",
  ];
  const rows = races.map((r) => [
    escapeCsvField(r.raceName),
    r.raceDate,
    r.distance,
    r.ageGroup,
    r.swimTime,
    r.bikeTime,
    r.runTime,
    r.finishTime,
    `${r.overallPercentile}%`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fullName.replace(/\s+/g, "-").toLowerCase()}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AthleteRaceList({ slug, fullName, races }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHidden(loadHidden(slug));
  }, [slug]);

  const toggle = useCallback(
    (key: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        saveHidden(slug, next);
        return next;
      });
    },
    [slug],
  );

  const visibleRaces = races.filter((r) => !hidden.has(raceKey(r)));
  const hasHidden = hidden.size > 0;

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => downloadCsv(fullName, visibleRaces)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <DownloadIcon />
          Export CSV
        </button>
      </div>
      <div className="space-y-4">
        {races.map((race) => {
          const key = raceKey(race);
          const isHidden = hidden.has(key);

          return (
            <div
              key={key}
              className={`flex items-start bg-gray-900 border rounded-lg transition-colors ${
                isHidden
                  ? "border-gray-800/50 opacity-50"
                  : "border-gray-800 hover:border-gray-600"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(key)}
                className="flex-shrink-0 p-3 pl-4 self-center text-gray-500 hover:text-gray-300 transition-colors"
                title={isHidden ? "Show in charts" : "Hide from charts"}
                aria-label={
                  isHidden
                    ? `Show ${race.raceName} in charts`
                    : `Hide ${race.raceName} from charts`
                }
              >
                {isHidden ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              <Link
                href={`/race/${race.raceSlug}/result/${race.resultId}`}
                className="block flex-1 min-w-0 px-3 py-4 pr-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">
                        {race.raceName}
                      </span>
                      <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                        {race.distance}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {race.raceDate} &middot; {race.ageGroup} &middot; Faster
                      than {race.overallPercentile}%
                    </div>
                  </div>
                  <div className="sm:text-right flex items-center sm:block gap-3 flex-shrink-0">
                    <div className="text-lg font-mono text-white">
                      {race.finishTime}
                    </div>
                    <div className="text-xs font-mono text-gray-500 sm:mt-1">
                      <span className="text-blue-400">{race.swimTime}</span>
                      {" / "}
                      <span className="text-red-400">{race.bikeTime}</span>
                      {" / "}
                      <span className="text-amber-400">{race.runTime}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {hasHidden && (
        <p className="text-sm text-gray-500 mt-2">
          {hidden.size} {hidden.size === 1 ? "result" : "results"} hidden from
          charts
        </p>
      )}

      <AthletePerformanceCharts races={[...visibleRaces].reverse()} />
    </>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
