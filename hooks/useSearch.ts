import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { unifiedSearch } from '@/services/contentService';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SearchFilter, SearchResult } from '@/types/search';

const DEBOUNCE_MS = 400;

export function useSearch() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const history = useSettingsStore((state) => state.searchHistory);
  const addSearchHistory = useSettingsStore((state) => state.addSearchHistory);
  const removeSearchHistory = useSettingsStore((state) => state.removeSearchHistory);
  const clearSearchHistory = useSettingsStore((state) => state.clearSearchHistory);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (typeof params.q === 'string' && params.q.trim() && params.q !== query) {
      setQuery(params.q);
    }
    // Only sync when route param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  const runSearch = useCallback(
    async (searchQuery: string, searchFilter: SearchFilter) => {
      const trimmed = searchQuery.trim();

      if (!trimmed) {
        setResults([]);
        setError(null);
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const response = await unifiedSearch(trimmed, searchFilter);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setResults(response.results);
        addSearchHistory(trimmed);
      } catch (searchError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        const message =
          searchError instanceof Error
            ? searchError.message
            : 'Something went wrong while searching.';
        setError(message);
        setResults([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [addSearchHistory],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      void runSearch(query, filter);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query, filter, runSearch]);

  const retry = useCallback(() => {
    void runSearch(query, filter);
  }, [query, filter, runSearch]);

  const selectHistoryItem = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const removeHistoryItem = useCallback(
    (term: string) => {
      removeSearchHistory(term);
    },
    [removeSearchHistory],
  );

  const clearHistory = useCallback(() => {
    clearSearchHistory();
  }, [clearSearchHistory]);

  const clearQuery = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  const hasQuery = query.trim().length > 0;
  const showHistory = !hasQuery && !loading && !error;
  const showEmpty = hasQuery && !loading && !error && results.length === 0;

  return {
    query,
    setQuery,
    filter,
    setFilter,
    history,
    results,
    loading,
    error,
    retry,
    selectHistoryItem,
    removeHistoryItem,
    clearHistory,
    clearQuery,
    hasQuery,
    showHistory,
    showEmpty,
  };
}
