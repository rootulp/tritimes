import { useEffect, useState } from "preact/hooks";
import AthleteRaceList from "./AthleteRaceList";
import NotFoundContent, { markNotFound, setPageMeta } from "./NotFoundContent";
import { fetchGzJson } from "@/lib/fetch-gz";
import { athleteShardId, unpackProfile, type AthleteShard, type RaceIndex } from "@/lib/athlete-file";
import type { AthleteProfile } from "@/lib/types";
import { getCountryFlagISO } from "@/lib/flags";
import { formatAthleteName } from "@/lib/format";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; profile: AthleteProfile };

/** Client-rendered /athlete/<slug>, served from one shell HTML file. */
export default function AthleteApp() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const m = window.location.pathname.match(/^\/athlete\/([^/]+)\/?$/);
    let slug: string | null = null;
    try {
      slug = m ? decodeURIComponent(m[1]) : null;
    } catch {
      // Malformed escaped URLs should reach the same missing-page UI.
    }
    if (!slug) {
      setState({ status: "missing" });
      return;
    }
    Promise.all([
      fetchGzJson<AthleteShard>(`/data/athlete/${athleteShardId(slug)}.json.gz`),
      fetchGzJson<RaceIndex>("/data/races.json.gz"),
    ]).then(
      ([shard, races]) => {
        const packed = shard && Object.hasOwn(shard, slug) ? shard[slug] : undefined;
        setState(packed && races ? { status: "ready", profile: unpackProfile(slug, packed, races) } : { status: "missing" });
      },
      () => setState({ status: "error" }),
    );
  }, []);

  useEffect(() => {
    if (state.status === "missing") markNotFound();
    if (state.status !== "ready") return;
    const { profile } = state;
    const name = formatAthleteName(profile.fullName);
    const raceCount = profile.races.length;
    setPageMeta(
      `${name} — Triathlon Race History`,
      `${name}${profile.country ? ` (${profile.country})` : ""} has ${raceCount} IRONMAN and IRONMAN 70.3 ${raceCount === 1 ? "result" : "results"} on TriTimes. View finish times, splits, and percentiles for every race.`,
      `/athlete/${profile.slug}`,
    );
  }, [state]);

  if (state.status === "loading") return <AthleteSkeleton />;
  if (state.status === "missing") return <NotFoundContent />;
  if (state.status === "error") {
    return (
      <main id="main-content" className="max-w-6xl w-full mx-auto px-4 py-16 text-center text-secondary">
        Couldn&apos;t load this athlete. Check your connection and{" "}
        <button className="text-accent hover:underline" onClick={() => window.location.reload()}>
          try again
        </button>
        .
      </main>
    );
  }

  const { profile } = state;
  const flag = getCountryFlagISO(profile.countryISO);
  return (
    <main id="main-content" className="max-w-6xl w-full mx-auto px-4 py-8">
      <header className="page-intro">
        <p className="eyebrow">Athlete race history</p>
        <h1 className="text-3xl font-bold text-foreground">
          {flag && <span className="mr-2">{flag}</span>}
          {formatAthleteName(profile.fullName)}
        </h1>
        <p className="text-secondary mt-1">
          {profile.country} &middot; {profile.races.length} {profile.races.length === 1 ? "race" : "races"}
        </p>
      </header>
      <AthleteRaceList slug={profile.slug} fullName={profile.fullName} races={profile.races} />
    </main>
  );
}

export function AthleteSkeleton() {
  // Keep the footer offscreen while an unknown-length race history loads.
  return (
    <main id="main-content" className="max-w-6xl w-full mx-auto px-4 py-8 min-h-screen animate-pulse" aria-busy="true">
      <header className="mb-8">
        <div className="h-9 w-64 bg-subtle rounded mb-2" />
        <div className="h-5 w-40 bg-subtle rounded" />
      </header>
      <div className="flex justify-end mb-4">
        <div className="h-5 w-24 bg-subtle rounded" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[86px] bg-surface border border-line rounded-lg" />
        ))}
      </div>
    </main>
  );
}
