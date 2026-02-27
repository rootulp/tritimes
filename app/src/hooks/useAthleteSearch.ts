"use client";

import { useState, useRef, useCallback } from "react";
import { track } from "@vercel/analytics";
import { AthleteSearchEntry } from "@/lib/types";

// Warm the search serverless function on first module load.
// Uses a short query to trigger index decompression without transferring much data.
let prefetchStarted = false;
if (typeof window !== "undefined" && !prefetchStarted) {
  prefetchStarted = true;
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

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    if (value.length < 2) {
      setMatches([]);
      setIsSearching(false);
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const key = value.toLowerCase();
      const cached = cacheRef.current.get(key);
      if (cached) {
        setMatches(cached);
        setIsSearching(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const data: AthleteSearchEntry[] = await res.json();
        cacheRef.current.set(key, data);
        setMatches(data);
      } catch {
        // Aborted or network error — ignore
      } finally {
        setIsSearching(false);
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
