import { useEffect, useState } from "preact/hooks";
import DisciplineSections from "./DisciplineSections";
import ShareDialog from "./ShareDialog";
import NotFoundContent, { markNotFound, setPageMeta } from "./NotFoundContent";
import ResultSkeleton from "./ResultSkeleton";
import { fetchGzJson } from "@/lib/fetch-gz";
import { countWhere, disciplineHistogram, getResult, type RaceFile } from "@/lib/race-file";
import type { AthleteResult } from "@/lib/types";
import type { Discipline } from "@/lib/histogram";
import { getCountryFlagISO } from "@/lib/flags";
import { slugifyAthlete } from "@/lib/athlete-slug";
import { formatAthleteName } from "@/lib/format";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; file: RaceFile; athlete: AthleteResult };

/** Client-rendered /race/<slug>/result/<id>, served from one shell HTML file. */
export default function ResultApp() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const m = window.location.pathname.match(/^\/race\/([^/]+)\/result\/(\d+)\/?$/);
    if (!m) {
      setState({ status: "missing" });
      return;
    }
    const [, slug, id] = m;
    fetchGzJson<RaceFile>(`/data/race/${slug}.json.gz`).then(
      (file) => {
        const athlete = file ? getResult(file, Number(id)) : undefined;
        setState(file && athlete ? { status: "ready", file, athlete } : { status: "missing" });
      },
      () => setState({ status: "error" }),
    );
  }, []);

  useEffect(() => {
    if (state.status === "missing") markNotFound();
    if (state.status !== "ready") return;
    const { file: race, athlete } = state;
    const name = formatAthleteName(athlete.fullName);
    const description = athlete.finishTime
      ? `${name} finished ${race.name} in ${athlete.finishTime}${athlete.ageGroup ? ` (${athlete.ageGroup})` : ""}. Swim ${athlete.swimTime}, bike ${athlete.bikeTime}, run ${athlete.runTime}. See percentiles and full-field time distributions.`
      : `${name}'s result at ${race.name}. See splits, percentiles, and full-field time distributions.`;
    setPageMeta(`${name} — ${race.name} Result`, description, `/race/${race.slug}/result/${athlete.id}`);
  }, [state]);

  if (state.status === "loading") return <ResultSkeleton />;
  if (state.status === "missing") return <NotFoundContent />;
  if (state.status === "error") {
    return (
      <main id="main-content" className="max-w-6xl w-full mx-auto px-4 py-16 text-center text-secondary">
        Couldn&apos;t load this result. Check your connection and{" "}
        <button className="text-accent hover:underline" onClick={() => window.location.reload()}>
          try again
        </button>
        .
      </main>
    );
  }
  return <Result file={state.file} athlete={state.athlete} />;
}

function Result({ file: race, athlete }: { file: RaceFile; athlete: AthleteResult }) {
  const slug = race.slug;
  const totalFinishers = race.id.length;
  const genderTotal = countWhere(race.g, race.genders.indexOf(athlete.gender));
  const ageGroupTotal = countWhere(race.ag, race.ageGroups.indexOf(athlete.ageGroup));

  const overallPct = Math.max(1, Math.round((athlete.overallRank / totalFinishers) * 100));
  const genderPct = Math.max(1, Math.round((athlete.genderRank / genderTotal) * 100));
  const ageGroupPct = Math.max(1, Math.round((athlete.ageGroupRank / ageGroupTotal) * 100));

  const flag = getCountryFlagISO(athlete.countryISO);
  const athleteSlug = slugifyAthlete(athlete.fullName, athlete.countryISO, athlete.gender);
  const location = [athlete.city, athlete.state, athlete.country].filter(Boolean).join(", ");
  const name = formatAthleteName(athlete.fullName);

  const section = (key: Discipline, label: string, time: string) => ({
    key,
    label,
    time,
    overall: disciplineHistogram(race, athlete, key, "overall"),
    ageGroup: disciplineHistogram(race, athlete, key, "ageGroup"),
  });

  return (
    <main id="main-content" className="max-w-6xl w-full mx-auto px-4 py-8">
      <a className="text-link text-sm inline-block mb-5" href={`/race/${slug}`}>← Race overview</a>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Race result</p>
          <h1 className="text-3xl font-bold text-foreground">
            {flag && <span className="mr-2">{flag}</span>}
            {athleteSlug ? (
              <a href={`/athlete/${athleteSlug}`} className="hover:text-accent transition-colors">
                {name}
              </a>
            ) : (
              name
            )}
          </h1>
          <p className="text-secondary mt-1">
            <a href={`/race/${slug}`} className="text-accent hover:underline">
              {race.name}
            </a>{" "}
            &middot; Bib #{athlete.bib} &middot; {athlete.ageGroup} &middot; {location}
          </p>
        </div>
        <ShareDialog
          url={`https://tritimes.org/race/${slug}/result/${athlete.id}`}
          filename={`${athlete.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${slug}`}
          card={{
            name,
            flag,
            meta: `${race.name} · ${race.date} · ${athlete.ageGroup}`,
            finishTime: athlete.finishTime,
            overallPct: Math.max(1, Math.round((athlete.overallRank / race.finishers) * 100)),
            ageGroupPct,
            splits: [
              { label: "Swim", time: athlete.swimTime },
              { label: "Bike", time: athlete.bikeTime },
              { label: "Run", time: athlete.runTime },
            ],
          }}
        />
      </header>

      <section className="result-summary panel" aria-label="Finish and placement">
        <div><p className="eyebrow">Finish time</p><p className="finish-time">{athlete.finishTime || "—"}</p><p className="text-sm text-secondary">{race.date} · {race.slug.startsWith("im703-") ? "70.3" : "140.6"} miles</p></div>
        <dl className="placement-grid">
          {[
            { label: "Overall", pct: overallPct, rank: athlete.overallRank, total: totalFinishers },
            { label: "Gender", pct: genderPct, rank: athlete.genderRank, total: genderTotal },
            { label: "Age Group", pct: ageGroupPct, rank: athlete.ageGroupRank, total: ageGroupTotal },
          ].map((item) => <div className="placement-card" key={item.label}>
            <dt className="text-xs text-secondary mb-1">{item.label}</dt>
            <dd className="placement-value">Top {item.pct}%</dd>
            <dd className="text-xs text-muted mt-1">{item.rank.toLocaleString()} of {item.total.toLocaleString()}{item.label === "Age Group" && <span className="block">{athlete.ageGroup}</span>}</dd>
          </div>)}
        </dl>
      </section>

      <DisciplineSections
        disciplines={[
          section("swim", "Swim", athlete.swimTime),
          section("bike", "Bike", athlete.bikeTime),
          section("run", "Run", athlete.runTime),
          section("finish", "Total", athlete.finishTime),
        ]}
        transitions={[section("t1", "T1", athlete.t1Time), section("t2", "T2", athlete.t2Time)]}
        ageGroup={athlete.ageGroup}
      />
    </main>
  );
}
