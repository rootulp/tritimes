"use client";

import { useState, useRef, useCallback } from "react";
import { track } from "@vercel/analytics";
import { AthleteSearchEntry } from "@/lib/types";

// Warm the search serverless function on first user intent (focus/open),
// not on module import — importing this hook on every route otherwise costs
// a network round-trip during hydration.
let prefetched = false;
export function prefetchSearch() {
  if (prefetched || typeof window === "undefined") return;
  prefetched = true;
  fetch("/api/search?q=a", { priority: "low" }).catch(() => {});
}

export function useAthleteSearch() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AthleteSearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef(new Map<string, AthleteSearchEntry[]>());
  const requestIdRef = useRef(0);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    if (value.length < 2) {
      requestIdRef.current += 1;
      setMatches([]);
      setIsSearching(false);
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      if (requestIdRef.current !== requestId) return;

      const key = value.toLowerCase();
      const cached = cacheRef.current.get(key);
      if (cached) {
        setMatches(cached);
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
        return;
      }

      setMatches([]);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const data: AthleteSearchEntry[] = await res.json();
        cacheRef.current.set(key, data);
        if (requestIdRef.current === requestId) {
          setMatches(data);
        }
      } catch {
        // Aborted or network error — ignore
      } finally {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 50);
  }, []);

  const trackSelect = useCallback(
    (athlete: AthleteSearchEntry) => {
      track("search_select", { query, athlete: athlete.fullName });
    },
    [query],
  );

  const reset = useCallback(() => {
    setQuery("");
    setMatches([]);
    setSelectedIndex(-1);
    setIsSearching(false);
    requestIdRef.current += 1;
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return {
    query,
    matches,
    isSearching,
    selectedIndex,
    setSelectedIndex,
    handleChange,
    trackSelect,
    reset,
  };
}
