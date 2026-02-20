"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AthleteSearchEntry } from "@/lib/types";
import { useAthleteSearch } from "@/hooks/useAthleteSearch";

export default function GlobalSearchBar() {
  const { query, matches, isSearching, selectedIndex, setSelectedIndex, handleChange } =
    useAthleteSearch();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync isOpen with matches
  useEffect(() => {
    setIsOpen(matches.length > 0);
  }, [matches]);

  function handleSelect(entry: AthleteSearchEntry) {
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(matches[selectedIndex]);
      router.push(`/athlete/${matches[selectedIndex].slug}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => matches.length > 0 && setIsOpen(true)}
          placeholder="Search athlete name..."
          className="w-full px-4 py-3 text-lg border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {matches.map((entry, i) => (
            <li
              key={entry.slug}
              className={`border-b border-gray-800 last:border-b-0 ${
                i === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800"
              }`}
            >
              <Link
                href={`/athlete/${entry.slug}`}
                onClick={() => handleSelect(entry)}
                className="block px-4 py-3"
              >
                <div className="font-medium text-white">{entry.fullName}</div>
                <div className="text-sm text-gray-400">
                  {entry.country} &middot; {entry.raceCount} {entry.raceCount === 1 ? "race" : "races"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
