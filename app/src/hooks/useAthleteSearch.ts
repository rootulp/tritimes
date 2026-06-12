"use client";

import { useState, useRef, useCallback } from "react";
import { track } from "@vercel/analytics";
import { AthleteSearchEntry } from "@/lib/types";
import {
  loadShardForQuery,
  searchAthletesInShard,
  type ClientSearchShard,
} from "@/lib/client-search-index";

// Report each shard load once, no matter how many queries hit it.
const trackedShards = new WeakSet<ClientSearchShard>();

function trackShardLoad(shard: ClientSearchShard) {
  if (shard.loadStats.bytes === 0 || trackedShards.has(shard)) return;
  trackedShards.add(shard);
  track("search_shard_load", {
    download_ms: Math.round(shard.loadStats.downloadMs),
    parse_ms: Math.round(shard.loadStats.parseMs),
    bytes: shard.loadStats.bytes,
  });
}

export function useAthleteSearch() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AthleteSearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef(
    new Map<string, { results: AthleteSearchEntry[]; source: "client" | "api" }>()
  );
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
    const startedAt = performance.now();
    debounceRef.current = setTimeout(async () => {
      if (requestIdRef.current !== requestId) return;

      const key = value.toLowerCase();
      const cacheEntry = cacheRef.current.get(key);
      if (cacheEntry) {
        setMatches(cacheEntry.results);
        if (requestIdRef.current === requestId) setIsSearching(false);
        track("search_latency", {
          latency_ms: Math.round(performance.now() - startedAt),
          query_length: value.length,
          source: cacheEntry.source,
          cached: true,
        });
        return;
      }

      // Client-side search over the query's prefix shard (one small static
      // asset per 2-char prefix, cached after first load).
      try {
        const shardPromise = loadShardForQuery(value);
        if (shardPromise) {
          const shard = await shardPromise;
          trackShardLoad(shard);
          const results = searchAthletesInShard(value, shard, 10);
          cacheRef.current.set(key, { results, source: "client" });
          if (requestIdRef.current === requestId) {
            setMatches(results);
            setIsSearching(false);
          }
          track("search_latency", {
            latency_ms: Math.round(performance.now() - startedAt),
            query_length: value.length,
            source: "client",
            cached: false,
          });
          return;
        }
      } catch {
        // Shard unavailable (e.g. no DecompressionStream or fetch failure) —
        // fall back to the API below.
      }
      if (requestIdRef.current !== requestId) return;

      setMatches([]);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const data: AthleteSearchEntry[] = await res.json();
        cacheRef.current.set(key, { results: data, source: "api" });
        if (requestIdRef.current === requestId) {
          setMatches(data);
        }
        track("search_latency", {
          latency_ms: Math.round(performance.now() - startedAt),
          query_length: value.length,
          source: "api",
          cached: false,
        });
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
