import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { AthleteSearchEntry } from "@/lib/types";
import { searchAthletes } from "@/lib/client-search-index";

/**
 * Debounced athlete typeahead over the static prefix shards. Each query loads
 * (and caches) the one shard for its first two normalized characters.
 */
export function useAthleteSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [matches, setMatches] = useState<AthleteSearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef(new Map<string, AthleteSearchEntry[]>());
  const requestIdRef = useRef(0);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current++;
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    setError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;
    if (value.trim().length < 2) {
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
          results = await searchAthletes(value, 10);
          cacheRef.current.set(key, results);
        } catch {
          results = [];
          if (requestIdRef.current === requestId) setError(true);
        }
      }
      if (requestIdRef.current !== requestId) return;
      setMatches(results);
      setIsSearching(false);
    // Give normal typing a chance to reach a smaller partition before starting
    // a potentially large two-letter download. Longer queries stay responsive.
    }, value.trim().length === 2 ? 200 : 50);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setMatches([]);
    setSelectedIndex(-1);
    setIsSearching(false);
    setError(false);
    requestIdRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { query, matches, isSearching, error, selectedIndex, setSelectedIndex, handleChange, reset };
}
