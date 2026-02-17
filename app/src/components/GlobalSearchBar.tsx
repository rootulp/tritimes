"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlobalSearchEntry } from "@/lib/types";

export default function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GlobalSearchEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleChange(value: string) {
    setQuery(value);
    setSelectedIndex(-1);
    if (value.length < 2) {
      setMatches([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      });
      const data: GlobalSearchEntry[] = await res.json();
      setMatches(data);
      setIsOpen(data.length > 0);
    } catch {
      // Aborted or network error — ignore
    }
  }

  function handleSelect(entry: GlobalSearchEntry) {
    setQuery(entry.fullName);
    setIsOpen(false);
    router.push(`/race/${entry.raceSlug}/result/${entry.id}`);
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
              key={`${entry.raceSlug}-${entry.id}`}
              onClick={() => handleSelect(entry)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-800 last:border-b-0 ${
                i === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800"
              }`}
            >
              <div className="font-medium text-white">{entry.fullName}</div>
              <div className="text-sm text-gray-400">
                {entry.raceName} &middot; {entry.ageGroup} &middot; {entry.country}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
