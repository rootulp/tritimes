"use client";

import { useMemo, useState } from "react";
import RaceHistogram from "./RaceHistogram";
import { BIN_SIZES, computeRaceHistogram, filterSegment } from "@/lib/histogram";
import { DISCIPLINE_COLORS } from "@/lib/colors";
import type { RaceSegmentData } from "@/lib/types";

const DISCIPLINES = [
  { key: "swim", label: "Swim", seconds: (d: RaceSegmentData) => d.swim },
  { key: "bike", label: "Bike", seconds: (d: RaceSegmentData) => d.bike },
  { key: "run", label: "Run", seconds: (d: RaceSegmentData) => d.run },
  { key: "finish", label: "Total", seconds: (d: RaceSegmentData) => d.finish },
] as const;

const ANY = -1;

export default function RaceDistributions({ data }: { data: RaceSegmentData }) {
  const [genderIdx, setGenderIdx] = useState(ANY);
  const [bandIdx, setBandIdx] = useState(ANY);

  const indices = useMemo(
    () => filterSegment(data, genderIdx, bandIdx),
    [data, genderIdx, bandIdx]
  );

  const histograms = useMemo(
    () =>
      DISCIPLINES.map((d) => {
        const all = d.seconds(data);
        const seconds = indices.map((i) => all[i]);
        return {
          key: d.key,
          label: d.label,
          histogram: computeRaceHistogram(seconds, BIN_SIZES[d.key]),
        };
      }),
    [data, indices]
  );

  const isFiltered = genderIdx !== ANY || bandIdx !== ANY;
  const total = data.swim.length;

  function reset() {
    setGenderIdx(ANY);
    setBandIdx(ANY);
  }

  const selectClass =
    "bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          <label htmlFor="race-dist-gender">Gender</label>
          <select
            id="race-dist-gender"
            className={selectClass}
            value={genderIdx}
            onChange={(e) => setGenderIdx(Number(e.target.value))}
          >
            <option value={ANY}>All</option>
            {data.genders.map((g, i) => (
              <option key={g} value={i}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 text-xs text-gray-400">
          <label htmlFor="race-dist-age-group">Age group</label>
          <select
            id="race-dist-age-group"
            className={selectClass}
            value={bandIdx}
            onChange={(e) => setBandIdx(Number(e.target.value))}
          >
            <option value={ANY}>All</option>
            {data.ageBands.map((b, i) => (
              <option key={b} value={i}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {isFiltered && (
          <div className="flex items-center gap-3 self-end pb-2">
            <span className="text-sm text-gray-400">
              {indices.length.toLocaleString()} of {total.toLocaleString()} finishers
            </span>
            <button
              onClick={reset}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {indices.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-10 text-center text-gray-400">
          No finishers match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {histograms.map((h) => (
            <div
              key={h.key}
              className="bg-gray-900 rounded-xl border border-gray-700 p-6"
            >
              <RaceHistogram
                data={h.histogram}
                color={DISCIPLINE_COLORS[h.label]}
                label={`${h.label} Distribution`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
