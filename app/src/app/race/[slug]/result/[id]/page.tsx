import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRaceBySlug, getAthleteById, getGenderCount, getAgeGroupCount, getAllResults } from "@/lib/data";
import ResultCard from "@/components/ResultCard";
import { getCountryFlagISO } from "@/lib/flags";
import { slugifyAthlete } from "@/lib/athlete-slug";
import { formatAthleteName } from "@/lib/format";
import HistogramSection, { HistogramSectionFallback } from "@/components/HistogramSection";
import ShareDialog from "@/components/ShareDialog";

// Render dynamically instead of ISR. There are 75K+ result URLs and traffic
// is a bot-driven long tail of unique paths: ISR wrote each first render to
// the cache but the entries were almost never read back (observed ~2%
// hit rate), so every crawl paid for a billed ISR write on top of the same
// function invocation a dynamic render costs. Skipping the cache entirely
// keeps per-request cost identical on misses and drops the write spend.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ResultPage({ params }: PageProps) {
  const { slug, id } = await params;
  const race = getRaceBySlug(slug);
  if (!race) notFound();

  const athlete = getAthleteById(slug, Number(id));
  if (!athlete) notFound();

  const totalFinishers = getAllResults(slug).length;
  const genderTotal = getGenderCount(slug, athlete.gender);
  const ageGroupTotal = getAgeGroupCount(slug, athlete.ageGroup);

  const overallPct = Math.max(1, Math.round((athlete.overallRank / totalFinishers) * 100));
  const genderPct = Math.max(1, Math.round((athlete.genderRank / genderTotal) * 100));
  const ageGroupPct = Math.max(1, Math.round((athlete.ageGroupRank / ageGroupTotal) * 100));

  const flag = getCountryFlagISO(athlete.countryISO);
  // Falls back to a plain heading when country/gender is missing.
  const athleteSlug = slugifyAthlete(athlete.fullName, athlete.countryISO, athlete.gender);
  const location = [athlete.city, athlete.state, athlete.country].filter(Boolean).join(", ");

  const shareUrl = `https://tritimes.org/race/${slug}/result/${id}`;
  const imageHref = `/race/${slug}/result/${id}/opengraph-image`;
  const downloadFilename = `${athlete.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${slug}`;

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-white">
            {flag && <span className="mr-2">{flag}</span>}
            {athleteSlug ? (
              <Link href={`/athlete/${athleteSlug}`} className="hover:text-blue-400 transition-colors">
                {formatAthleteName(athlete.fullName)}
              </Link>
            ) : (
              formatAthleteName(athlete.fullName)
            )}
          </h1>
          <p className="text-gray-400 mt-1">
            <Link href={`/race/${slug}`} className="text-blue-400 hover:underline">{race.name}</Link> &middot; Bib #{athlete.bib} &middot; {athlete.ageGroup} &middot; {location}
          </p>
        </div>
        <ShareDialog url={shareUrl} imageHref={imageHref} filename={downloadFilename} />
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <ResultCard
          label="Overall"
          value={`Top ${overallPct}%`}
          subtext={`${athlete.overallRank} of ${totalFinishers}`}
        />
        <ResultCard
          label="Gender"
          value={`Top ${genderPct}%`}
          subtext={`${athlete.genderRank} of ${genderTotal}`}
        />
        <ResultCard
          label="Age Group"
          value={`Top ${ageGroupPct}%`}
          subtext={`${athlete.ageGroupRank} of ${ageGroupTotal} · ${athlete.ageGroup}`}
        />
      </div>

      <Suspense fallback={<HistogramSectionFallback />}>
        <HistogramSection slug={slug} athlete={athlete} />
      </Suspense>
    </main>
  );
}
