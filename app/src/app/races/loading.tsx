export default function Loading() {
  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8 animate-pulse">
      {/* Header */}
      <div className="h-8 w-40 bg-gray-800 rounded mb-8" />

      {/* Filter pills */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 bg-gray-800 rounded-full" />
        ))}
      </div>

      {/* Race list */}
      <div className="space-y-3">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="h-5 w-56 bg-gray-800 rounded mb-2" />
                <div className="h-4 w-36 bg-gray-800 rounded" />
              </div>
              <div className="h-5 w-20 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
