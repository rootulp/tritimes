"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAthleteSearch } from "@/hooks/useAthleteSearch";
import { getCountryFlagISO } from "@/lib/flags";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const { query, matches, isSearching, selectedIndex, setSelectedIndex, handleChange, reset } =
    useAthleteSearch();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  // Global keyboard listener + custom event from Header
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => {
          if (prev) {
            reset();
            return false;
          }
          return true;
        });
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    }
    function onOpenEvent() {
      setIsOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpenEvent);
    };
  }, [reset, isOpen, close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Auto-select first result when matches change
  useEffect(() => {
    if (matches.length > 0) {
      setSelectedIndex(0);
    }
  }, [matches, setSelectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const items = listRef.current.children;
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      router.push(`/athlete/${matches[selectedIndex].slug}`);
      close();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search athletes"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" />

      {/* Dialog */}
      <div className="w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3">
          <svg
            className="w-5 h-5 text-gray-500 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search athlete name..."
            className="flex-1 bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-activedescendant={
              selectedIndex >= 0 ? `command-palette-item-${selectedIndex}` : undefined
            }
          />
          {isSearching ? (
            <div className="h-5 w-5 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin shrink-0" />
          ) : (
            <kbd className="hidden sm:inline-block text-xs border border-gray-600 rounded px-1.5 py-0.5 text-gray-500 font-mono shrink-0">
              ESC
            </kbd>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800" />

        {/* Results */}
        {matches.length > 0 ? (
          <ul
            ref={listRef}
            id="command-palette-results"
            role="listbox"
            className="max-h-80 overflow-y-auto"
          >
            {matches.map((entry, i) => (
              <li
                key={entry.slug}
                id={`command-palette-item-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                className={`border-b border-gray-800 last:border-b-0 ${
                  i === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800/50"
                }`}
              >
                <Link
                  href={`/athlete/${entry.slug}`}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-3"
                  tabIndex={-1}
                >
                  <span className="text-lg shrink-0">
                    {getCountryFlagISO(entry.countryISO) || "\u{1F3CA}"}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{entry.fullName}</div>
                    <div className="text-sm text-gray-400">
                      {entry.country} &middot; {entry.raceCount}{" "}
                      {entry.raceCount === 1 ? "race" : "races"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : query.length >= 2 && !isSearching ? (
          <div className="py-8 text-center text-gray-500">No athletes found</div>
        ) : (
          <div className="py-8 text-center text-gray-500">Search for an athlete by name</div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-800 px-4 py-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="border border-gray-600 rounded px-1 py-0.5 font-mono">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-gray-600 rounded px-1 py-0.5 font-mono">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-gray-600 rounded px-1 py-0.5 font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
