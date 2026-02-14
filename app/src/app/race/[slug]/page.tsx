import { notFound } from "next/navigation";
import Link from "next/link";
import { getRaces, getRaceBySlug, getSearchIndex } from "@/lib/data";
import SearchBar from "@/components/SearchBar";

export async function generateStaticParams() {
  return getRaces().map((race) => ({ slug: race.slug }));
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
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          &larr; All races
        </Link>
        <h1 className="text-5xl font-bold text-gray-900 mb-2">TriTimes</h1>
        <p className="text-lg text-gray-600">
          {race.name} — {entries.length} finishers
        </p>
        <p className="text-sm text-gray-400 mt-1">
          See how you performed relative to the field
        </p>
      </div>
      <SearchBar entries={entries} raceSlug={slug} />
    </main>
  );
}
