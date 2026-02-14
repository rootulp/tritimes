import { getSearchIndex } from "@/lib/data";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  const entries = getSearchIndex();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-2">TriTimes</h1>
        <p className="text-lg text-gray-600">
          IronMan 70.3 New York 2025 — {entries.length} finishers
        </p>
        <p className="text-sm text-gray-400 mt-1">
          See how you performed relative to the field
        </p>
      </div>
      <SearchBar entries={entries} />
    </main>
  );
}
