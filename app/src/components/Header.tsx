"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function getIsMac() {
  return navigator.platform.toUpperCase().includes("MAC");
}

function subscribe() {
  return () => {};
}

function useIsMac() {
  return useSyncExternalStore(subscribe, getIsMac, () => false);
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("open-command-palette"));
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMac = useIsMac();
  const pathname = usePathname();

  const links = [
    { href: "/races", label: "Races" },
    { href: "/courses", label: "Courses" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-white hover:text-gray-300 transition-colors">
          TriTimes
        </Link>

        {/* Center: Search button (desktop: full, mobile: icon only) */}
        <button
          onClick={openCommandPalette}
          className="hidden sm:flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-lg px-3 py-1.5 hover:border-gray-600"
        >
          <SearchIcon />
          <span>Search</span>
          <kbd className="text-xs border border-gray-600 rounded px-1.5 py-0.5 text-gray-500 font-mono">
            {isMac ? "\u2318K" : "Ctrl+K"}
          </kbd>
        </button>
        <button
          onClick={openCommandPalette}
          className="sm:hidden flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white transition-colors"
          aria-label="Search athletes"
        >
          <SearchIcon />
        </button>

        {/* Right: nav links (desktop) / hamburger (mobile) */}
        <nav className="hidden sm:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "text-white font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-gray-800 bg-gray-900/95">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 text-base transition-colors ${
                pathname === link.href
                  ? "text-white bg-gray-800/50"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/30"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
