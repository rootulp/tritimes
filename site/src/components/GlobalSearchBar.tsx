import { useEffect, useRef, useState } from "preact/hooks";
import { useAthleteSearch } from "@/hooks/useAthleteSearch";
import { formatAthleteName } from "@/lib/format";

/** Text typed into the static input before this island hydrated. */
function typedBeforeHydration(): string {
  if (typeof document === "undefined") return "";
  return (document.getElementById("global-search") as HTMLInputElement | null)?.value ?? "";
}

export default function GlobalSearchBar() {
  const { query, matches, isSearching, selectedIndex, setSelectedIndex, handleChange } = useAthleteSearch(
    typedBeforeHydration(),
  );
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewState =
    query.trim().length < 2 ? "closed" : matches.length > 0 ? "results" : isSearching ? "loading" : "empty";

  useEffect(() => {
    if (query) handleChange(query);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(viewState !== "closed");
  }, [viewState]);

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      setIsOpen(false);
      window.location.assign(`/athlete/${matches[selectedIndex].slug}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg mx-auto">
      <div className="relative">
        <input
          id="global-search"
          type="text"
          value={query}
          onInput={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (viewState !== "closed") setIsOpen(true);
          }}
          placeholder="Search athlete name..."
          className="w-full px-4 py-3 text-lg border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && viewState !== "closed" && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {viewState === "loading" ? (
            <li className="px-4 py-4 text-sm text-gray-400" aria-live="polite">
              Searching athletes...
            </li>
          ) : viewState === "empty" ? (
            <li className="px-4 py-4 text-sm text-gray-400" aria-live="polite">
              No athletes found
            </li>
          ) : (
            matches.map((entry, i) => (
              <li
                key={entry.slug}
                className={`border-b border-gray-800 last:border-b-0 ${i === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800"}`}
              >
                <a href={`/athlete/${entry.slug}`} onClick={() => setIsOpen(false)} className="block px-4 py-3">
                  <div className="font-medium text-white">{formatAthleteName(entry.fullName)}</div>
                  <div className="text-sm text-gray-400">
                    {entry.country} &middot; {entry.raceCount} {entry.raceCount === 1 ? "race" : "races"}
                  </div>
                </a>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
