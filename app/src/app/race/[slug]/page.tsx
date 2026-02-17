import { notFound } from "next/navigation";
import { getRaces, getRaceBySlug, getSearchIndex } from "@/lib/data";
import SearchBar from "@/components/SearchBar";

// Generate on demand — too many races to pre-render at build time.
export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RaceSearchPage({ params }: PageProps) {
  const { slug } = await params;
  const race = getRaceBySlug(slug);
  if (!race) notFound();

  const entries = getSearchIndex(slug);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">TriTimes</h1>
        <p className="text-lg text-gray-400">
          {race.name} — {entries.length} finishers
        </p>
        <p className="text-sm text-gray-500 mt-1">
          See how you performed relative to the field
        </p>
      </div>
      <SearchBar entries={entries} raceSlug={slug} />
    </main>
  );
}
