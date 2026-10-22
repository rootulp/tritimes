/** Placeholder shaped like the result page, shown until its race file loads. */
export default function ResultSkeleton() {
  return (
    <main id="main-content" className="max-w-6xl w-full mx-auto px-4 py-8 animate-pulse" aria-busy="true">
      <header className="mb-8">
        <div className="h-9 w-64 bg-subtle rounded mb-2" />
        <div className="h-5 w-80 max-w-full bg-subtle rounded" />
      </header>
      <section className="result-summary panel" aria-label="Loading result">
        <div><div className="h-4 w-24 bg-subtle rounded mb-3" /><div className="h-16 w-56 max-w-full bg-subtle rounded" /></div>
        <div className="placement-grid">{[1, 2, 3].map((i) => <div key={i} className="placement-card"><div className="h-4 w-16 max-w-full bg-subtle rounded mb-2" /><div className="h-7 w-20 max-w-full bg-subtle rounded" /></div>)}</div>
      </section>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-lg border border-line p-4 text-center">
            <div className="h-4 w-12 bg-subtle rounded mx-auto mb-2" />
            <div className="h-6 w-16 bg-subtle rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="flex justify-center mb-6">
        <div className="h-12 w-60 bg-subtle rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-xl border border-line p-6">
            <div className="h-6 w-32 bg-subtle rounded mb-4" />
            <div className="h-[260px] bg-subtle/60 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
