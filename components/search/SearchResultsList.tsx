import { useEffect, useMemo, useState } from 'react';
import { getEnglishChapterCount } from '@/services/englishChapterCount';
import { FlatList, View } from 'react-native';

import { SearchResultItem } from '@/components/search/SearchResultItem';
import { Text } from '@/components/ui';
import type { SearchResult } from '@/types/search';

type SearchResultsListProps = {
  results: SearchResult[];
  query: string;
  onResultPress?: (item: SearchResult) => void;
};

export function SearchResultsList({ results, query, onResultPress }: SearchResultsListProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const controller = new AbortController();
    for (const item of results) {
      if (item.type === 'anime' || item.chapterCount !== undefined) continue;
      getEnglishChapterCount(item.id, controller.signal).then(count => {
        if (!controller.signal.aborted) setCounts(previous => previous[item.id] === count ? previous : { ...previous, [item.id]: count });
      }, () => {});
    }
    return () => controller.abort();
  }, [results]);
  const sortedResults = useMemo(() => [...results].sort((a, b) => {
    const count = (item: SearchResult) => item.type === 'anime' ? item.episodeCount ?? -1 : counts[item.id] ?? item.chapterCount ?? -1;
    return count(b) - count(a);
  }), [results, counts]);
  return (
    <FlatList
      data={sortedResults}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-3 px-4 pb-8"
      ListHeaderComponent={
        <Text tone="muted" className="mb-1">
          {results.length} result{results.length === 1 ? '' : 's'} for &quot;{query}&quot;
        </Text>
      }
      renderItem={({ item }) => (
        <SearchResultItem item={item} onPress={() => onResultPress?.(item)} />
      )}
      ItemSeparatorComponent={() => <View className="h-0" />}
    />
  );
}
