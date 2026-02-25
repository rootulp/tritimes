import Link from "next/link";
import { getStatsPageData } from "@/lib/data";
import { getCountryFlagISO } from "@/lib/flags";

export const metadata = {
  title: "Stats | TriTimes",
  description:
    "Aggregate statistics across all IRONMAN and IRONMAN 70.3 races tracked by TriTimes.",
};

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
      <p className="text-sm text-gray-400">{label}</p>
      {children}
    </div>
  );
}

function BigNumber({ value }: { value: string }) {
  return <p className="text-3xl font-bold text-white mt-1">{value}</p>;
}

function RaceLink({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/race/${slug}`}
      className="text-lg font-semibold text-white hover:text-blue-400 transition-colors mt-1 block"
    >
      {name}
    </Link>
  );
}

function ResultLink({ raceSlug, resultId, label }: { raceSlug: string; resultId: number; label: string }) {
  return (
    <Link
      href={`/race/${raceSlug}/result/${resultId}`}
      className="text-white hover:text-blue-400 transition-colors"
    >
      {label}
    </Link>
  );
}

export default function StatsPage() {
  const stats = getStatsPageData();
  const agg = stats.aggregate;
  const totalGender = agg.maleCount + agg.femaleCount;
  const malePct = totalGender > 0 ? Math.round((agg.maleCount / totalGender) * 100) : 0;
  const femalePct = totalGender > 0 ? 100 - malePct : 0;

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Stats</h1>

      {/* Overview */}
      <h2 className="text-xl font-semibold text-gray-300 mb-4">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Race Results">
          <BigNumber value={stats.totalResults.toLocaleString()} />
        </StatCard>
        <StatCard label="Unique Athletes">
          <BigNumber value={stats.uniqueAthletes.toLocaleString()} />
        </StatCard>
        <StatCard label="Races">
          <BigNumber value={stats.raceCount.toLocaleString()} />
        </StatCard>
        <StatCard label="IRONMAN Courses">
          <BigNumber value={stats.ironmanCourseCount.toLocaleString()} />
        </StatCard>
        <StatCard label="IRONMAN 70.3 Courses">
          <BigNumber value={stats.halfIronmanCourseCount.toLocaleString()} />
        </StatCard>
        <StatCard label="Races by Distance">
          <p className="text-lg font-semibold text-white mt-1">
            {stats.ironmanRaceCount} full / {stats.halfIronmanRaceCount} half
          </p>
        </StatCard>
        <StatCard label="Earliest Race">
          <RaceLink slug={stats.earliestRace.slug} name={stats.earliestRace.name} />
          <p className="text-sm text-gray-500 mt-0.5">{stats.earliestRace.date}</p>
        </StatCard>
        <StatCard label="Most Recent Race">
          <RaceLink slug={stats.mostRecentRace.slug} name={stats.mostRecentRace.name} />
          <p className="text-sm text-gray-500 mt-0.5">{stats.mostRecentRace.date}</p>
        </StatCard>
        <StatCard label="Average Participants per Race">
          <BigNumber value={stats.avgParticipants.toLocaleString()} />
        </StatCard>
      </div>

      {/* Race Size */}
      <h2 className="text-xl font-semibold text-gray-300 mb-4">Race Size</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Largest Race">
          <RaceLink slug={stats.largestRace.slug} name={stats.largestRace.name} />
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.largestRace.finishers.toLocaleString()} finishers
          </p>
        </StatCard>
        <StatCard label="Smallest Race">
          <RaceLink slug={stats.smallestRace.slug} name={stats.smallestRace.name} />
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.smallestRace.finishers.toLocaleString()} finishers
          </p>
        </StatCard>
        <StatCard label="Year with Most Races">
          <BigNumber value={stats.yearWithMostRaces.year} />
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.yearWithMostRaces.count} races
          </p>
        </StatCard>
      </div>

      {/* Geography */}
      <h2 className="text-xl font-semibold text-gray-300 mb-4">Geography</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Countries Represented">
          <BigNumber value={agg.uniqueCountries.toLocaleString()} />
        </StatCard>
        {agg.mostCommonCountry && (
          <StatCard label="Most Common Country">
            <p className="text-3xl font-bold text-white mt-1">
              {getCountryFlagISO(agg.mostCommonCountry.countryISO)} {agg.mostCommonCountry.countryISO}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {agg.mostCommonCountry.count.toLocaleString()} results
            </p>
          </StatCard>
        )}
        <StatCard label="Location with Most 70.3 Events">
          <p className="text-lg font-semibold text-white mt-1">
            {stats.locationMost703.location}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.locationMost703.count} events
          </p>
        </StatCard>
        <StatCard label="Location with Most IRONMAN Events">
          <p className="text-lg font-semibold text-white mt-1">
            {stats.locationMostIM.location}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.locationMostIM.count} events
          </p>
        </StatCard>
      </div>

      {/* Records */}
      <h2 className="text-xl font-semibold text-gray-300 mb-4">Records</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Fastest Finish">
          <p className="text-2xl font-bold text-white mt-1">{agg.fastestFinish.time}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            <ResultLink
              raceSlug={agg.fastestFinish.raceSlug}
              resultId={agg.fastestFinish.resultId}
              label={agg.fastestFinish.fullName}
            />
          </p>
        </StatCard>
        <StatCard label="Slowest Finish">
          <p className="text-2xl font-bold text-white mt-1">{agg.slowestFinish.time}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            <ResultLink
              raceSlug={agg.slowestFinish.raceSlug}
              resultId={agg.slowestFinish.resultId}
              label={agg.slowestFinish.fullName}
            />
          </p>
        </StatCard>
        <StatCard label="Average Finish Time">
          <BigNumber value={formatSeconds(agg.averageFinishSeconds)} />
        </StatCard>
        <StatCard label="Fastest Swim Split">
          <p className="text-2xl font-bold text-white mt-1">{agg.fastestSwim.time}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            <ResultLink
              raceSlug={agg.fastestSwim.raceSlug}
              resultId={agg.fastestSwim.resultId}
              label={agg.fastestSwim.fullName}
            />
          </p>
        </StatCard>
        <StatCard label="Fastest Bike Split">
          <p className="text-2xl font-bold text-white mt-1">{agg.fastestBike.time}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            <ResultLink
              raceSlug={agg.fastestBike.raceSlug}
              resultId={agg.fastestBike.resultId}
              label={agg.fastestBike.fullName}
            />
          </p>
        </StatCard>
        <StatCard label="Fastest Run Split">
          <p className="text-2xl font-bold text-white mt-1">{agg.fastestRun.time}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            <ResultLink
              raceSlug={agg.fastestRun.raceSlug}
              resultId={agg.fastestRun.resultId}
              label={agg.fastestRun.fullName}
            />
          </p>
        </StatCard>
      </div>

      {/* Demographics */}
      <h2 className="text-xl font-semibold text-gray-300 mb-4">Demographics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {agg.mostCommonAgeGroup && (
          <StatCard label="Most Common Age Group">
            <BigNumber value={agg.mostCommonAgeGroup.ageGroup} />
            <p className="text-sm text-gray-500 mt-0.5">
              {agg.mostCommonAgeGroup.count.toLocaleString()} results
            </p>
          </StatCard>
        )}
        <StatCard label="Male / Female Participation">
          <p className="text-lg font-semibold text-white mt-1">
            {agg.maleCount.toLocaleString()} / {agg.femaleCount.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {malePct}% male / {femalePct}% female
          </p>
        </StatCard>
        <StatCard label="Repeat Athletes">
          <BigNumber value={stats.repeatAthletes.toLocaleString()} />
          <p className="text-sm text-gray-500 mt-0.5">athletes with 2+ races</p>
        </StatCard>
        <StatCard label="Athlete with Most Races">
          <Link
            href={`/athlete/${stats.athleteWithMostRaces.slug}`}
            className="text-lg font-semibold text-white hover:text-blue-400 transition-colors mt-1 block"
          >
            {stats.athleteWithMostRaces.fullName}
          </Link>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.athleteWithMostRaces.raceCount} races
          </p>
        </StatCard>
      </div>

      {/* Race Analysis */}
      <h2 className="text-xl font-semibold text-gray-300 mb-4">Race Analysis</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agg.mostCompetitiveRace && (
          <StatCard label="Most Competitive Race">
            <RaceLink slug={agg.mostCompetitiveRace.slug} name={agg.mostCompetitiveRace.name} />
            <p className="text-sm text-gray-500 mt-0.5">
              {formatSeconds(agg.mostCompetitiveRace.seconds)} gap between 1st–10th
            </p>
          </StatCard>
        )}
        {agg.tightestFinishSpread && (
          <StatCard label="Tightest Finish Spread">
            <RaceLink slug={agg.tightestFinishSpread.slug} name={agg.tightestFinishSpread.name} />
            <p className="text-sm text-gray-500 mt-0.5">
              {formatSeconds(agg.tightestFinishSpread.seconds)} spread
            </p>
          </StatCard>
        )}
        {agg.widestFinishSpread && (
          <StatCard label="Widest Finish Spread">
            <RaceLink slug={agg.widestFinishSpread.slug} name={agg.widestFinishSpread.name} />
            <p className="text-sm text-gray-500 mt-0.5">
              {formatSeconds(agg.widestFinishSpread.seconds)} spread
            </p>
          </StatCard>
        )}
        {agg.longestAvgTransition && (
          <StatCard label="Longest Avg Transition Time">
            <RaceLink slug={agg.longestAvgTransition.slug} name={agg.longestAvgTransition.name} />
            <p className="text-sm text-gray-500 mt-0.5">
              {formatSeconds(agg.longestAvgTransition.seconds)} avg T1+T2
            </p>
          </StatCard>
        )}
      </div>
    </main>
  );
}
