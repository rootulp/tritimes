import { useCallback, useRef, useState } from "preact/hooks";
import type { AthleteSearchEntry } from "@/lib/types";
import { loadShardForQuery, searchAthletesInShard } from "@/lib/client-search-index";

/**
 * Debounced athlete typeahead over the static prefix shards. Each query loads
 * (and caches) the one shard for its first two normalized characters.
 */
export function useAthleteSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [matches, setMatches] = useState<AthleteSearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef(new Map<string, AthleteSearchEntry[]>());
  const requestIdRef = useRef(0);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;
    if (value.length < 2) {
      setMatches([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const key = value.toLowerCase();
      let results = cacheRef.current.get(key);
      if (!results) {
        try {
          const shard = await loadShardForQuery(value);
          results = shard ? searchAthletesInShard(value, shard, 10) : [];
          cacheRef.current.set(key, results);
        } catch {
          results = [];
        }
      }
      if (requestIdRef.current !== requestId) return;
      setMatches(results);
      setIsSearching(false);
    }, 50);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setMatches([]);
    setSelectedIndex(-1);
    setIsSearching(false);
    requestIdRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { query, matches, isSearching, selectedIndex, setSelectedIndex, handleChange, reset };
}
