import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-6">
        <Link
          href="/stats"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Stats
        </Link>
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLScavYEE5U8S1Cx2OyLxFpDMPgNh5gcZh_VsbLawOBNkdYtNOQ/viewform"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Feedback
        </a>
      </div>
    </footer>
  );
}
