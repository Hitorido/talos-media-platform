import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  SearchBar,
  SearchEmptyState,
  SearchErrorState,
  SearchFilterTabs,
  SearchHistoryList,
  SearchLoadingState,
  SearchResultsList,
} from '@/components/search';
import { Screen } from '@/components/ui';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
import { useSearch } from '@/hooks/useSearch';

export default function SearchScreen() {
  const router = useRouter();
  const {
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
  } = useSearch();

  const showResults = hasQuery && !loading && !error && results.length > 0;

  return (
    <Screen className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <SearchBar value={query} onChangeText={setQuery} onClear={clearQuery} />
          <SearchFilterTabs value={filter} onChange={setFilter} />
        </View>

        <View className="flex-1">
          {error ? <SearchErrorState message={error} onRetry={retry} /> : null}

          {!error && loading ? <SearchLoadingState /> : null}

          {!error && !loading && showEmpty ? <SearchEmptyState query={query.trim()} /> : null}

          {!error && !loading && showResults ? (
            <SearchResultsList
              results={results}
              query={query.trim()}
              onResultPress={(item) => {
                if (item.type === 'anime') {
                  router.push(animeDetailsHref(item.id));
                } else if (item.type === 'manga') {
                  router.push(mangaDetailsHref(item.id));
                } else if (item.type === 'novel') {
                  router.push(novelDetailsHref(item.id));
                }
              }}
            />
          ) : null}

          {!error && !loading && showHistory ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="flex-grow px-4 py-4"
            >
              <SearchHistoryList
                history={history}
                onSelect={selectHistoryItem}
                onRemove={removeHistoryItem}
                onClear={clearHistory}
              />
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
