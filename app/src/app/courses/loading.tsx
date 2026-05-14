export default function Loading() {
  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-56 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-80 bg-gray-800 rounded" />
      </div>

      {/* Chart cards */}
      <div className="space-y-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border border-gray-800 rounded-lg p-6">
            <div className="h-6 w-40 bg-gray-800 rounded mb-4" />
            <div className="h-64 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
