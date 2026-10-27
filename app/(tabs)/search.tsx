import { GenreFilters } from '@/components/content/GenreFilters';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import {
    SearchBar,
    SearchEmptyState,
    SearchErrorState,
    SearchFilterTabs,
    SearchHistoryList,
    SearchLoadingState,
    SearchResultsList,
    SourceFilter,
} from '@/components/search';
import { Screen } from '@/components/ui';
import { Text } from '@/components/ui/Text';
import { useSearch } from '@/hooks/useSearch';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';

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

  const [genre, setGenre] = useState('All genres');
  const [source, setSource] = useState('All sources');
  const genres = [...new Set(results.flatMap((item) => item.tags))].sort();
  const sources = [...new Set(results.map((item) => item.providerId))].sort();
  const selectedGenre = genres.includes(genre) ? genre : 'All genres';
  const selectedSource = sources.includes(source) ? source : 'All sources';
  const filteredResults =
    selectedGenre === 'All genres' && selectedSource === 'All sources'
      ? results
      : results.filter(
          (item) =>
            (selectedGenre === 'All genres' || item.tags.includes(selectedGenre)) &&
            (selectedSource === 'All sources' || item.providerId === selectedSource),
        );
  const showResults = hasQuery && !error && results.length > 0;

  return (
    <Screen className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <SearchBar value={query} onChangeText={setQuery} onClear={clearQuery} onSubmit={retry} />
          <SearchFilterTabs value={filter} onChange={setFilter} />
          <GenreFilters genres={genres} value={selectedGenre} onChange={setGenre} />
          <SourceFilter sources={sources} value={selectedSource} onChange={setSource} />
          <SearchSuggestions filter={filter} query={query} results={results} />
        </View>

        <View className="flex-1">
          {error ? <SearchErrorState message={error} onRetry={retry} /> : null}

          {!error && loading && !showResults ? <SearchLoadingState /> : null}
          {!error && loading && showResults ? (
            <Text className="px-4 py-2">Searching more sources...</Text>
          ) : null}

          {!error && !loading && showEmpty ? <SearchEmptyState query={query.trim()} /> : null}

          {!error && showResults ? (
            <SearchResultsList
              results={filteredResults}
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
