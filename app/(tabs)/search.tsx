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
import { providerRegistry } from '@/providers';
import { getProviderDisplayName } from '@/services/contentService';
import type { SearchResult } from '@/types/search';

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
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const genres = [...new Set(results.flatMap((item: SearchResult) => item.tags))].sort();
  const allProviders = providerRegistry.list();
  const sourceOptions = allProviders.map(p => ({ id: p.definition.id, name: getProviderDisplayName(p.definition.id) }));
  const sources = ['All sources', ...sourceOptions.map(s => s.name)].sort();
  const selectedGenre = genres.includes(genre) ? genre : 'All genres';
  const filteredResults =
    selectedGenre === 'All genres' && !selectedProviderId
      ? results
      : results.filter(
          (item: SearchResult) =>
            (selectedGenre === 'All genres' || item.tags.includes(selectedGenre)) &&
            (!selectedProviderId || item.providerId === selectedProviderId),
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
            <View className="px-4 pt-4">
              <GenreFilters genres={genres} value={selectedGenre} onChange={setGenre} />
              <SourceFilter 
                sources={sourceOptions.map(s => s.name)} 
                value={selectedProviderId ? sourceOptions.find(s => s.id === selectedProviderId)?.name || 'All sources' : 'All sources'} 
                onChange={(name) => setSelectedProviderId(name === 'All sources' ? null : sourceOptions.find(s => s.name === name)?.id || null)} 
              />
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
            </View>
          ) : null}

          {!error && !loading && showHistory ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="flex-grow px-4 py-4"
            >
              <GenreFilters genres={genres} value={selectedGenre} onChange={setGenre} />
              <SourceFilter 
                sources={sourceOptions.map(s => s.name)} 
                value={selectedProviderId ? sourceOptions.find(s => s.id === selectedProviderId)?.name || 'All sources' : 'All sources'} 
                onChange={(name) => setSelectedProviderId(name === 'All sources' ? null : sourceOptions.find(s => s.name === name)?.id || null)} 
              />
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
