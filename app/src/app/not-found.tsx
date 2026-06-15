import Link from "next/link";
import GlobalSearchBar from "@/components/GlobalSearchBar";

export const metadata = {
  title: "Page not found | TriTimes",
};

export default function NotFound() {
  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <div className="flex flex-col items-center text-center pt-16 pb-20">
        <p className="text-sm font-semibold tracking-widest text-blue-400 uppercase mb-3">
          404
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Page not found
        </h1>
        <p className="text-gray-400 max-w-md mb-10 leading-relaxed">
          This page doesn&apos;t exist — the link may be stale, or the race or
          result may have moved. Try searching for an athlete below.
        </p>

        <div className="w-full max-w-lg mb-10">
          <GlobalSearchBar />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/races"
            className="px-5 py-2.5 rounded-lg border border-gray-700/80 bg-gray-900 hover:border-gray-500 text-white font-semibold transition-colors"
          >
            Browse races
          </Link>
        </div>
      </div>
    </main>
  );
}
