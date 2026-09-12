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
  return (
    <FlatList
      data={results}
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
