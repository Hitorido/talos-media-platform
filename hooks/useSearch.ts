import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useNovelPreferencesStore } from '@/stores/novelPreferencesStore';
import { unifiedSearch } from '@/services/contentService';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SearchFilter, SearchResult } from '@/types/search';

const DEBOUNCE_MS = 400;

// Stable empty result list so "no results yet" never changes identity.
const EMPTY_RESULTS: SearchResult[] = [];

export function useSearch() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  const [query, setQueryState] = useState(initialQuery);
  const [filter, setFilterState] = useState<SearchFilter>('all');
  const novelLanguage = useNovelPreferencesStore((state) => state.language);
  const history = useSettingsStore((state) => state.searchHistory);
  const addSearchHistory = useSettingsStore((state) => state.addSearchHistory);
  const removeSearchHistory = useSettingsStore((state) => state.removeSearchHistory);
  const clearSearchHistory = useSettingsStore((state) => state.clearSearchHistory);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  // The pending debounce timer lives in a ref so an immediate submit (retry)
  // cancels it; otherwise it fires a duplicate search right after.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidate = useCallback(() => {
    ++requestIdRef.current;
    controllerRef.current?.abort();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const setQuery = useCallback(
    (value: string) => {
      if (value === query) return;
      // Results/loading/error for the previous query are invalidated by the
      // searchKey mismatch below, so only the query itself needs writing.
      invalidate();
      setQueryState(value);
    },
    [invalidate, query],
  );
  const setFilter = useCallback(
    (value: SearchFilter) => {
      if (value === filter) return;
      invalidate();
      setFilterState(value);
    },
    [invalidate, filter],
  );

  // Search output is tagged with the query+filter that produced it. A mismatch
  // means "stale", which is derived during render — so adopting a new route
  // query or a new filter never cascades a setState out of an effect body.
  const searchKey = `${query}|${filter}`;
  const [state, setState] = useState<{
    key: string;
    results: SearchResult[];
    loading: boolean;
    error: string | null;
  }>(() => ({
    key: searchKey,
    results: EMPTY_RESULTS,
    // A deep-linked query is already "in flight" on mount, so the spinner shows
    // immediately instead of waiting out the debounce.
    loading: query.trim().length > 0,
    error: null,
  }));
  const settled = state.key === searchKey;
  const currentResults = settled ? state.results : EMPTY_RESULTS;
  const currentLoading = settled ? state.loading : query.trim().length > 0;
  const currentError = settled ? state.error : null;

  // Adopt a new route query during render (deep links, browser back/forward on
  // web) so the field and the results reset in the same pass.
  const routeQuery = typeof params.q === 'string' ? params.q : '';
  if (routeQuery.trim() && routeQuery !== query) setQueryState(routeQuery);

  // The debounce timer must live in a ref so an immediate submit (retry) can
  // cancel it; otherwise a pending timer fires a duplicate search right after.
  const runSearch = useCallback(
    async (searchQuery: string, searchFilter: SearchFilter) => {
      invalidate();
      const trimmed = searchQuery.trim();
      const key = `${searchQuery}|${searchFilter}`;

      if (!trimmed) {
        setState({ key, results: EMPTY_RESULTS, loading: false, error: null });
        return;
      }

      const requestId = requestIdRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const response = await unifiedSearch(trimmed, searchFilter, {
          signal: controller.signal,
          novelLanguage,
          onProgress: (items) => {
            if (requestId !== requestIdRef.current) return;
            // The requestId check above already proves this request is current,
            // so progressive results adopt their key and stream in immediately
            // instead of waiting for every provider to settle.
            setState({ key, results: items, loading: true, error: null });
          },
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setState({ key, results: response.results, loading: false, error: null });
        addSearchHistory(trimmed);
      } catch (searchError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        const message =
          searchError instanceof Error
            ? searchError.message
            : 'Something went wrong while searching.';
        setState({ key, results: EMPTY_RESULTS, loading: false, error: message });
      }
    },
    [addSearchHistory, invalidate, novelLanguage],
  );

  // Debounce + cancellation only — no state is written from the effect body, so
  // typing stays responsive and nothing cascades a render.
  useEffect(() => {
    const timer = setTimeout(() => {
      timerRef.current = null;
      void runSearch(query, filter);
    }, DEBOUNCE_MS);
    timerRef.current = timer;

    return () => {
      clearTimeout(timer);
      if (timerRef.current === timer) timerRef.current = null;
      invalidate();
    };
  }, [query, filter, runSearch, invalidate]);

  const retry = useCallback(() => {
    void runSearch(query, filter);
  }, [query, filter, runSearch]);

  const selectHistoryItem = useCallback(
    (term: string) => {
      setQuery(term);
    },
    [setQuery],
  );

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
  }, [setQuery]);

  const hasQuery = query.trim().length > 0;
  const showHistory = !hasQuery && !currentLoading && !currentError;
  const showEmpty = hasQuery && !currentLoading && !currentError && currentResults.length === 0;

  return {
    query,
    setQuery,
    filter,
    setFilter,
    history,
    results: currentResults,
    loading: currentLoading,
    error: currentError,
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
