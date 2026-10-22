import { useEffect, useRef, useState } from "preact/hooks";
import { useAthleteSearch } from "@/hooks/useAthleteSearch";
import { formatAthleteName } from "@/lib/format";

/** Text typed into the static input before this island hydrated. */
function typedBeforeHydration(): string {
  if (typeof document === "undefined") return "";
  return (document.getElementById("global-search") as HTMLInputElement | null)?.value ?? "";
}

export default function GlobalSearchBar() {
  const { query, matches, isSearching, error, selectedIndex, setSelectedIndex, handleChange } = useAthleteSearch(
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
    } else if (e.key === "Enter" && selectedIndex >= 0 && selectedIndex < matches.length) {
      e.preventDefault();
      setIsOpen(false);
      window.location.assign(`/athlete/${matches[selectedIndex].slug}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <svg aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
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
          aria-label="Search athlete name"
          className="search-field"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && viewState === "results"}
          aria-controls={isOpen && viewState === "results" ? "athlete-search-results" : undefined}
          aria-activedescendant={isOpen && matches[selectedIndex] ? `athlete-match-${selectedIndex}` : undefined}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 border-2 border-strong border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && viewState !== "closed" && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-line rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {viewState === "loading" ? (
            <div className="px-4 py-4 text-sm text-secondary" role="status">
              Searching athletes...
            </div>
          ) : error ? (
            <div className="px-4 py-4 text-sm text-secondary" role="alert">
              Couldn&apos;t load search results.{" "}
              <button type="button" className="text-accent hover:underline" onClick={() => handleChange(query)}>Try again</button>
            </div>
          ) : viewState === "empty" ? (
            <div className="px-4 py-4 text-sm text-secondary" role="status">
              No athletes found
            </div>
          ) : (
            <ul id="athlete-search-results" role="listbox" aria-label="Athlete matches">{matches.map((entry, i) => (
              <li
                key={entry.slug}
                role="presentation"
                className={`border-b border-line last:border-b-0 ${i === selectedIndex ? "bg-subtle" : "hover:bg-subtle"}`}
              >
                <a id={`athlete-match-${i}`} role="option" aria-selected={i === selectedIndex} tabIndex={-1} href={`/athlete/${entry.slug}`} onClick={() => setIsOpen(false)} className="block px-4 py-3">
                  <div className="font-medium text-foreground">{formatAthleteName(entry.fullName)}</div>
                  <div className="text-sm text-secondary">
                    {entry.country} &middot; {entry.raceCount} {entry.raceCount === 1 ? "race" : "races"}
                  </div>
                </a>
              </li>
            ))}</ul>
          )}
        </div>
      )}
    </div>
  );
}
