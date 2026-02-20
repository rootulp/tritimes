export default function Loading() {
  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-28 bg-gray-800 rounded mb-6" />

      {/* Header */}
      <header className="mb-8">
        <div className="h-8 w-64 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-80 bg-gray-800 rounded" />
      </header>

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center">
            <div className="h-3 w-16 bg-gray-800 rounded mx-auto mb-2" />
            <div className="h-6 w-20 bg-gray-800 rounded mx-auto mb-1" />
            <div className="h-3 w-24 bg-gray-800 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Discipline time cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center">
            <div className="h-3 w-12 bg-gray-800 rounded mx-auto mb-2" />
            <div className="h-6 w-16 bg-gray-800 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Histogram placeholders */}
      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-5 w-24 bg-gray-800 rounded mb-4" />
            <div className="h-48 bg-gray-900 border border-gray-800 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
