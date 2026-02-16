import Link from "next/link";
import { getGlobalSearchIndex } from "@/lib/data";
import GlobalSearchBar from "@/components/GlobalSearchBar";

export default function Home() {
  const entries = getGlobalSearchIndex();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">TriTimes</h1>
        <p className="text-lg text-gray-400">
          See how you performed relative to the field
        </p>
      </div>
      <GlobalSearchBar entries={entries} />
      <Link href="/races" className="text-sm text-gray-500 hover:text-gray-300 mt-6">
        Browse all races
      </Link>
    </main>
  );
}
