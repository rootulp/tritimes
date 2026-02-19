"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchEntry } from "@/lib/types";

export default function SearchBar({ entries, raceSlug }: { entries: SearchEntry[]; raceSlug: string }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
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

  function handleChange(value: string) {
    setQuery(value);
    setSelectedIndex(-1);
    if (value.length < 2) {
      setMatches([]);
      setIsOpen(false);
      return;
    }
    const lower = value.toLowerCase();
    const filtered = entries
      .filter((e) => e.fullName.toLowerCase().includes(lower))
      .slice(0, 10);
    setMatches(filtered);
    setIsOpen(filtered.length > 0);
  }

  function handleSelect(entry: SearchEntry) {
    setQuery(entry.fullName);
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
      router.push(`/race/${raceSlug}/result/${matches[selectedIndex].id}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => matches.length > 0 && setIsOpen(true)}
        placeholder="Search athlete name..."
        className="w-full px-4 py-3 text-lg border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {isOpen && (
        <ul className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {matches.map((entry, i) => (
            <li
              key={entry.id}
              className={`border-b border-gray-800 last:border-b-0 ${
                i === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800"
              }`}
            >
              <Link
                href={`/race/${raceSlug}/result/${entry.id}`}
                onClick={() => handleSelect(entry)}
                className="block px-4 py-3"
              >
                <div className="font-medium text-white">{entry.fullName}</div>
                <div className="text-sm text-gray-400">
                  {entry.ageGroup} &middot; {entry.country}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
