import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useNovelPreferencesStore } from '@/stores/novelPreferencesStore';
import { unifiedSearch } from '@/services/contentService';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SearchFilter, SearchResult } from '@/types/search';

const DEBOUNCE_MS = 400;

export function useSearch() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  const [query, setQueryState] = useState(initialQuery);
  const [filter, setFilterState] = useState<SearchFilter>('all');
  const novelLanguage = useNovelPreferencesStore(state => state.language);
  const history = useSettingsStore((state) => state.searchHistory);
  const addSearchHistory = useSettingsStore((state) => state.addSearchHistory);
  const removeSearchHistory = useSettingsStore((state) => state.removeSearchHistory);
  const clearSearchHistory = useSettingsStore((state) => state.clearSearchHistory);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidate = useCallback(() => {
    ++requestIdRef.current;
    controllerRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  const setQuery = useCallback((value: string) => {
    if (value === query) return;
    invalidate();
    setResults([]);
    setError(null);
    setLoading(Boolean(value.trim()));
    setQueryState(value);
  }, [invalidate, query]);
  const setFilter = useCallback((value: SearchFilter) => {
    if (value === filter) return;
    invalidate();
    setResults([]);
    setLoading(Boolean(query.trim()));
    setFilterState(value);
  }, [invalidate, filter, query]);

  useEffect(() => {
    if (typeof params.q === 'string' && params.q.trim() && params.q !== query) {
      setQuery(params.q);
    }
    // Only sync when route param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  const runSearch = useCallback(
    async (searchQuery: string, searchFilter: SearchFilter) => {
      invalidate();
      const trimmed = searchQuery.trim();

      if (!trimmed) {
        setResults([]);
        setError(null);
        setLoading(false);
        return;
      }

      const requestId = requestIdRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const response = await unifiedSearch(trimmed, searchFilter, {
          signal: controller.signal,
          novelLanguage,
          onProgress: (items) => {
            if (requestId === requestIdRef.current) setResults(items);
          },
        });

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
    [addSearchHistory, invalidate, novelLanguage],
  );

  useEffect(() => {
    invalidate();
    setResults([]);
    setLoading(Boolean(query.trim()));
    timerRef.current = setTimeout(() => {
      void runSearch(query, filter);
    }, DEBOUNCE_MS);

    return invalidate;
  }, [query, filter, runSearch, invalidate]);

  const retry = useCallback(() => {
    void runSearch(query, filter);
  }, [query, filter, runSearch]);

  const selectHistoryItem = useCallback((term: string) => {
    setQuery(term);
  }, [setQuery]);

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
  }, [setQuery]);

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
