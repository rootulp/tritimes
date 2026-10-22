import type { HistogramBin, RaceHistogramData } from "./types";

// Pure, corpus-independent histogram helpers. This module MUST stay free of
// fs/path/zlib and any import that reaches lib/data.ts so client components can
// import it without pulling the ~190MB data corpus into their bundle.

export type Discipline = "swim" | "bike" | "run" | "finish" | "t1" | "t2";

export const BIN_SIZES: Record<Discipline, number> = {
  swim: 300, // 5-minute bins
  bike: 600, // 10-minute bins
  run: 600, // 10-minute bins
  finish: 600, // 10-minute bins
  t1: 60, // 1-minute bins
  t2: 60, // 1-minute bins
};

export function formatSecondsShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}m`;
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeRaceHistogram(
  allSeconds: number[],
  binSize: number
): RaceHistogramData {
  const valid = allSeconds.filter((s) => s > 0);
  if (valid.length === 0) {
    return { bins: [], medianSeconds: 0, totalAthletes: 0 };
  }

  const min = Math.floor(Math.min(...valid) / binSize) * binSize;
  const max = Math.ceil(Math.max(...valid) / binSize) * binSize;

  const bins: HistogramBin[] = [];
  for (let start = min; start < max; start += binSize) {
    const end = start + binSize;
    const count = valid.filter((s) => s >= start && s < end).length;
    bins.push({
      label: formatSecondsShort(start),
      rangeStart: start,
      rangeEnd: end,
      count,
      isAthlete: false,
    });
  }

  const medianSeconds = computeMedian(valid);
  return { bins, medianSeconds, totalAthletes: valid.length };
}

// Strips the leading M/F gender prefix off an IRONMAN age-group code so
// "M35-39" and "F35-39" collapse to a single "35-39" band ("MPRO" -> "PRO").
// Values that don't match (free-form/odd age groups) pass through unchanged.
export function deriveAgeBand(ageGroup: string): string {
  const m = /^[MF](.+)$/.exec(ageGroup);
  return m ? m[1] : ageGroup;
}

export interface SegmentArrays {
  genderIdx: number[];
  ageBandIdx: number[];
}

// Returns the indices of finishers matching the selected gender and age band.
// A negative selector means "any".
export function filterSegment(
  data: SegmentArrays,
  genderIdx: number,
  ageBandIdx: number
): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.genderIdx.length; i++) {
    if (genderIdx >= 0 && data.genderIdx[i] !== genderIdx) continue;
    if (ageBandIdx >= 0 && data.ageBandIdx[i] !== ageBandIdx) continue;
    out.push(i);
  }
  return out;
}
