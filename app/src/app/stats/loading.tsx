export default function Loading() {
  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8 animate-pulse">
      {/* Title */}
      <div className="h-8 w-24 bg-gray-800 rounded mb-8" />

      {/* Overview section */}
      <div className="h-6 w-28 bg-gray-800 rounded mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
            <div className="h-4 w-32 bg-gray-800 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Race Size section */}
      <div className="h-6 w-28 bg-gray-800 rounded mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
            <div className="h-4 w-32 bg-gray-800 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Geography section */}
      <div className="h-6 w-32 bg-gray-800 rounded mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
            <div className="h-4 w-32 bg-gray-800 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Finish Times section */}
      <div className="h-6 w-48 bg-gray-800 rounded mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
            <div className="h-4 w-32 bg-gray-800 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Demographics section */}
      <div className="h-6 w-36 bg-gray-800 rounded mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="p-5 border border-gray-700/80 rounded-lg bg-gray-900">
            <div className="h-4 w-32 bg-gray-800 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
