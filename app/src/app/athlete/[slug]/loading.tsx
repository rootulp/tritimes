export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-28 bg-gray-800 rounded mb-6" />

      {/* Header */}
      <header className="mb-8">
        <div className="h-8 w-64 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-40 bg-gray-800 rounded" />
      </header>

      {/* Race cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="h-5 w-48 bg-gray-800 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-800 rounded" />
              </div>
              <div className="text-right">
                <div className="h-6 w-20 bg-gray-800 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-800 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
