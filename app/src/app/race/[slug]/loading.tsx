export default function Loading() {
  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8 animate-pulse">
      {/* Header */}
      <header className="mb-8">
        <div className="h-8 w-72 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-800 rounded" />
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center">
            <div className="h-3 w-16 bg-gray-800 rounded mx-auto mb-2" />
            <div className="h-6 w-20 bg-gray-800 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Discipline breakdown table */}
      <section className="mb-10">
        <div className="h-6 w-48 bg-gray-800 rounded mb-4" />
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-4 bg-gray-800 rounded" />
          ))}
        </div>
      </section>

      {/* Time distributions */}
      <section className="mb-10">
        <div className="h-6 w-40 bg-gray-800 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="h-4 w-32 bg-gray-800 rounded mb-3" />
              <div className="h-48 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
