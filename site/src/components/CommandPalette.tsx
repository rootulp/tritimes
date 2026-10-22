import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useAthleteSearch } from "@/hooks/useAthleteSearch";
import { getCountryFlagISO } from "@/lib/flags";
import { formatAthleteName } from "@/lib/format";

export default function CommandPalette({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { query, matches, isSearching, error, selectedIndex, setSelectedIndex, handleChange, reset } = useAthleteSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => {
          if (prev) reset();
          return !prev;
        });
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    }
    const onOpenEvent = () => setIsOpen(true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpenEvent);
    };
  }, [reset, isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (matches.length > 0) setSelectedIndex(0);
  }, [matches, setSelectedIndex]);

  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    listRef.current.children[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0 && selectedIndex < matches.length) {
      e.preventDefault();
      window.location.assign(`/athlete/${matches[selectedIndex].slug}`);
      close();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search athletes"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" />

      <div ref={dialogRef} className="w-full max-w-lg mx-4 bg-surface border border-line rounded-xl shadow-2xl overflow-hidden animate-in">
        <div className="flex items-center gap-3 px-4 py-3">
          <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" stroke-linecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onInput={(e) => handleChange(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search athlete name..."
            aria-label="Search athlete name"
            className="flex-1 bg-transparent text-lg text-foreground placeholder-muted focus:outline-none"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-activedescendant={selectedIndex >= 0 ? `command-palette-item-${selectedIndex}` : undefined}
          />
          {isSearching ? (
            <div className="h-5 w-5 border-2 border-strong border-t-accent rounded-full animate-spin shrink-0" />
          ) : (
            <kbd className="hidden sm:inline-block text-xs border border-strong rounded px-1.5 py-0.5 text-muted font-mono shrink-0">
              ESC
            </kbd>
          )}
        </div>

        <div className="border-t border-line" />

        {matches.length > 0 ? (
          <ul ref={listRef} id="command-palette-results" role="listbox" className="max-h-80 overflow-y-auto">
            {matches.map((entry, i) => (
              <li
                key={entry.slug}
                id={`command-palette-item-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                className={`border-b border-line last:border-b-0 ${i === selectedIndex ? "bg-subtle" : "hover:bg-subtle/50"}`}
              >
                <a href={`/athlete/${entry.slug}`} onClick={close} className="flex items-center gap-3 px-4 py-3" tabIndex={-1}>
                  <span className="text-lg shrink-0">{getCountryFlagISO(entry.countryISO) || "\u{1F3CA}"}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{formatAthleteName(entry.fullName)}</div>
                    <div className="text-sm text-secondary">
                      {entry.country} &middot; {entry.raceCount} {entry.raceCount === 1 ? "race" : "races"}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="py-8 text-center text-secondary" role="alert">
            Couldn&apos;t load search results.{" "}
            <button type="button" className="text-accent hover:underline" onClick={() => handleChange(query)}>Try again</button>
          </div>
        ) : query.length >= 2 && !isSearching ? (
          <div className="py-8 text-center text-muted">No athletes found</div>
        ) : (
          <div className="py-8 text-center text-muted">Search for an athlete by name</div>
        )}

        <div className="border-t border-line px-4 py-2 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <kbd className="border border-strong rounded px-1 py-0.5 font-mono">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-strong rounded px-1 py-0.5 font-mono">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-strong rounded px-1 py-0.5 font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
