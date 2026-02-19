import GlobalSearchBar from "@/components/GlobalSearchBar";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero section */}
      <section className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-[#0a0a0a] to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-28 pb-20">
          <h1 className="text-6xl sm:text-7xl font-bold text-white tracking-tight mb-4">
            Race. Analyze.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Improve.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-xl mb-10 leading-relaxed">
            Explore your IronMan &amp; 70.3 results with full field distributions.
            See where you stand in swim, bike, run, and overall.
          </p>

          <div className="w-full max-w-lg">
            <GlobalSearchBar />
          </div>
        </div>
      </section>
    </main>
  );
}
