/** Placeholder shaped like the result page, shown until its race file loads. */
export default function ResultSkeleton() {
  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8 animate-pulse" aria-busy="true">
      <header className="mb-8">
        <div className="h-9 w-64 bg-gray-800 rounded mb-2" />
        <div className="h-5 w-80 bg-gray-800 rounded" />
      </header>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center">
            <div className="h-4 w-16 bg-gray-800 rounded mx-auto mb-2" />
            <div className="h-7 w-20 bg-gray-800 rounded mx-auto mb-1" />
            <div className="h-3 w-24 bg-gray-800 rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center">
            <div className="h-4 w-12 bg-gray-800 rounded mx-auto mb-2" />
            <div className="h-6 w-16 bg-gray-800 rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="flex justify-center mb-6">
        <div className="h-12 w-60 bg-gray-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <div className="h-6 w-32 bg-gray-800 rounded mb-4" />
            <div className="h-[260px] bg-gray-800/60 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
