"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { RaceInfo } from "@/lib/types";
import { getCountryFlag } from "@/lib/flags";
import { getRaceLocation } from "@/lib/raceLocation";
import { filterRaces } from "@/lib/race-filter";
import { filtersToQueryString, parseFiltersFromParams } from "@/lib/races-url";

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

/**
 * Renders the grid of race cards. Memoized so that urgent re-renders (e.g.
 * toggling the "updating" indicator the instant a filter button is clicked)
 * don't re-render all ~1,500 cards — only a change to the filtered list does.
 */
const RaceGrid = memo(function RaceGrid({ races }: { races: RaceInfo[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {races.map((race) => {
        const location = getRaceLocation(race);
        const flag = location ? getCountryFlag(location) : "";

        return (
          <Link
            key={race.slug}
            href={`/race/${race.slug}`}
            className="group block p-5 border border-gray-700/80 rounded-lg bg-gray-900 transition-colors duration-200 hover:border-gray-600 hover:bg-gray-800/80 [content-visibility:auto] [contain-intrinsic-size:auto_150px]"
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
              {location}
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
  );
});

export default function RaceList({ races }: { races: RaceInfo[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seed the filters from the URL so shared links open pre-filtered and Back
  // from a race detail restores the view — RaceList remounts on Back and
  // re-reads the URL here. Local state stays the urgent source of truth, which
  // keeps the search input snappy while the deferred grid re-renders (see below).
  const initial = parseFiltersFromParams(new URLSearchParams(searchParams.toString()));
  const [distance, setDistance] = useState<string>(initial.distance);
  const [year, setYear] = useState<string>(initial.year);
  const [query, setQuery] = useState<string>(initial.query);

  // Mirror the active filters into the URL so a filtered view is shareable.
  // replace (not push) keeps per-keystroke states out of browser history, so
  // there is no intra-page history to restore — hence no URL→state sync needed.
  useEffect(() => {
    const qs = filtersToQueryString({ distance, year, query });
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [distance, year, query, pathname, router, searchParams]);

  // Filter selections stay urgent so buttons/inputs update the instant they're
  // clicked. The expensive list is derived from *deferred* copies, so React
  // paints the new button state first, then re-renders the ~1,500-card grid in
  // a non-blocking background pass instead of freezing the click for seconds.
  const deferredDistance = useDeferredValue(distance);
  const deferredYear = useDeferredValue(year);
  const deferredQuery = useDeferredValue(query);

  const years = [...new Set(races.map((r) => getYear(r.date)))].sort().reverse();

  const filtered = useMemo(
    () =>
      filterRaces(races, {
        distance: deferredDistance,
        year: deferredYear,
        query: deferredQuery,
      }),
    [races, deferredDistance, deferredYear, deferredQuery],
  );

  // True while the displayed list is stale — i.e. a filter changed but the
  // deferred grid re-render hasn't caught up yet. Drives the loading indicator.
  const isPending =
    distance !== deferredDistance ||
    year !== deferredYear ||
    query !== deferredQuery;

  const btnClass = (active: boolean) =>
    active
      ? "px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white ring-1 ring-white/20"
      : "px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors";

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Distance</span>
          {["All", "70.3", "140.6"].map((d) => (
            <button
              key={d}
              onClick={() => setDistance(d)}
              className={btnClass(distance === d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Year</span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white ring-1 ring-white/20 border-none appearance-none cursor-pointer pr-7 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M3%205l3%203%203-3%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat"
          >
            <option value="All" className="bg-gray-900 text-white">All</option>
            {years.map((y) => (
              <option key={y} value={y} className="bg-gray-900 text-white">
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="race-search"
            className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1"
          >
            Search
          </label>
          <input
            id="race-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or location"
            autoComplete="off"
            className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white ring-1 ring-white/20 border-none placeholder:text-gray-500 focus:outline-none focus:ring-white/40 w-56"
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <span>
          Showing {filtered.length} of {races.length} races
        </span>
        {isPending && (
          <span className="inline-flex items-center gap-1.5 text-gray-400" role="status">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border-2 border-gray-600 border-t-gray-300 animate-spin"
            />
            Updating&hellip;
          </span>
        )}
      </p>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-400">No races match your filters.</p>
          <button
            onClick={() => {
              setDistance("All");
              setYear("All");
              setQuery("");
            }}
            className="mt-3 px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 ring-1 ring-white/20 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      <div
        className={
          isPending
            ? "opacity-60 transition-opacity duration-150"
            : "transition-opacity duration-150"
        }
      >
        <RaceGrid races={filtered} />
      </div>
    </>
  );
}
