import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-white hover:text-gray-300 transition-colors">
          TriTimes
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/races" className="text-sm text-gray-400 hover:text-white transition-colors">
            Races
          </Link>
          <Link href="/courses" className="text-sm text-gray-400 hover:text-white transition-colors">
            Courses
          </Link>
          <Link href="/stats" className="text-sm text-gray-400 hover:text-white transition-colors">
            Stats
          </Link>
        </nav>
      </div>
    </header>
  );
}
