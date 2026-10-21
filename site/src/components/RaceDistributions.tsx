import { useEffect, useMemo, useState } from "preact/hooks";
import RaceHistogram from "./RaceHistogram";
import { BIN_SIZES, computeRaceHistogram, filterSegment } from "@/lib/histogram";
import { DISCIPLINE_COLORS } from "@/lib/colors";
import { fetchGzJson } from "@/lib/fetch-gz";
import { raceFileSegments, type RaceFile } from "@/lib/race-file";
import type { RaceHistogramData, RaceSegmentData } from "@/lib/types";

const DISCIPLINES = [
  { key: "swim", label: "Swim" },
  { key: "bike", label: "Bike" },
  { key: "run", label: "Run" },
  { key: "finish", label: "Total" },
] as const;

type Key = (typeof DISCIPLINES)[number]["key"];
const ANY = -1;

interface Props {
  /** Unfiltered histograms, rendered into the static HTML. */
  initial: Record<Key, RaceHistogramData>;
  genders: string[];
  ageBands: string[];
  total: number;
  /** Per-finisher data, fetched the first time a filter is used. */
  source: { race: string } | { course: string };
}

/** A select's current DOM value, so a choice made before hydration isn't lost. */
function selectedBeforeHydration(id: string): number {
  if (typeof document === "undefined") return ANY;
  const el = document.getElementById(id) as HTMLSelectElement | null;
  return el ? Number(el.value) : ANY;
}

const cache = new Map<string, Promise<RaceSegmentData | null>>();

function loadSegments(source: Props["source"]): Promise<RaceSegmentData | null> {
  const url = "race" in source ? `/data/race/${source.race}.json.gz` : `/data/course/${source.course}.json.gz`;
  let promise = cache.get(url);
  if (!promise) {
    promise =
      "race" in source
        ? fetchGzJson<RaceFile>(url).then((f) => (f ? raceFileSegments(f) : null))
        : fetchGzJson<RaceSegmentData>(url);
    promise.catch(() => cache.delete(url));
    cache.set(url, promise);
  }
  return promise;
}

export default function RaceDistributions({ initial, genders, ageBands, total, source }: Props) {
  const [genderIdx, setGenderIdx] = useState(() => selectedBeforeHydration("race-dist-gender"));
  const [bandIdx, setBandIdx] = useState(() => selectedBeforeHydration("race-dist-age-group"));
  const [data, setData] = useState<RaceSegmentData | null>(null);
  const [error, setError] = useState(false);
  const isFiltered = genderIdx !== ANY || bandIdx !== ANY;

  useEffect(() => {
    if (isFiltered) prefetch();
  }, []);

  function prefetch() {
    if (data) return;
    loadSegments(source).then(
      (d) => {
        setData(d);
        setError(!d);
      },
      () => setError(true),
    );
  }

  const filtered = useMemo(() => {
    if (!isFiltered || !data) return null;
    const indices = filterSegment(data, genderIdx, bandIdx);
    const histograms = Object.fromEntries(
      DISCIPLINES.map((d) => [d.key, computeRaceHistogram(indices.map((i) => data[d.key][i]), BIN_SIZES[d.key])]),
    ) as Record<Key, RaceHistogramData>;
    return { count: indices.length, histograms };
  }, [data, genderIdx, bandIdx, isFiltered]);

  const pending = isFiltered && !filtered && !error;
  const histograms = filtered?.histograms ?? initial;
  const count = filtered ? filtered.count : total;

  function reset() {
    setGenderIdx(ANY);
    setBandIdx(ANY);
  }

  const selectClass =
    "bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6" onPointerEnter={prefetch} onFocusIn={prefetch}>
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          <label htmlFor="race-dist-gender">Gender</label>
          <select
            id="race-dist-gender"
            className={selectClass}
            value={genderIdx}
            onChange={(e) => {
              prefetch();
              setGenderIdx(Number(e.currentTarget.value));
            }}
          >
            <option value={ANY}>All</option>
            {genders.map((g, i) => (
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
            onChange={(e) => {
              prefetch();
              setBandIdx(Number(e.currentTarget.value));
            }}
          >
            <option value={ANY}>All</option>
            {ageBands.map((b, i) => (
              <option key={b} value={i}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {isFiltered && (
          <div className="flex items-center gap-3 self-end pb-2">
            <span className="text-sm text-gray-400">
              {pending ? "Loading…" : error ? "Couldn't load finishers" : `${count.toLocaleString()} of ${total.toLocaleString()} finishers`}
            </span>
            <button onClick={reset} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Reset
            </button>
          </div>
        )}
      </div>

      {count === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-10 text-center text-gray-400">
          No finishers match this filter.
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${pending ? "opacity-60" : ""}`}>
          {DISCIPLINES.map((d) => (
            <div key={d.key} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <RaceHistogram data={histograms[d.key]} color={DISCIPLINE_COLORS[d.label]} label={`${d.label} Distribution`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
