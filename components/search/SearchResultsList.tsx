import { groupSearchResults, type SearchGroup } from '@/services/searchGrouping';
import { SelectionModal } from '@/components/content/SelectionModal';
import { getProviderDisplayName } from '@/services/contentService';
import { useEffect, useMemo, useState } from 'react';
import { getEnglishChapterCount } from '@/services/englishChapterCount';
import { FlatList, View, useWindowDimensions } from 'react-native';

import { SearchResultItem } from '@/components/search/SearchResultItem';
import { Text } from '@/components/ui';
import type { SearchResult } from '@/types/search';

type SearchResultsListProps = {
  results: SearchResult[];
  query: string;
  onResultPress?: (item: SearchResult) => void;
};

export function SearchResultsList({ results, query, onResultPress }: SearchResultsListProps) {
  const [selectedGroup, setSelectedGroup] = useState<SearchGroup | null>(null);
  const { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(Math.min(width, 1280));
  const columns = 3;
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const controller = new AbortController();
    for (const item of results) {
      if (item.type === 'anime' || item.chapterCount !== undefined) continue;
      getEnglishChapterCount(item.id, controller.signal).then(
        (count) => {
          if (!controller.signal.aborted)
            setCounts((previous) =>
              previous[item.id] === count ? previous : { ...previous, [item.id]: count },
            );
        },
        () => {},
      );
    }
    return () => controller.abort();
  }, [results]);
  const sortedResults = useMemo(
    () =>
      [...results].sort((a, b) => {
        const count = (item: SearchResult) =>
          item.type === 'anime'
            ? (item.episodeCount ?? -1)
            : (counts[item.id] ?? item.chapterCount ?? -1);
        return count(b) - count(a);
      }),
    [results, counts],
  );
  const groups = useMemo(() => groupSearchResults(sortedResults), [sortedResults]);
  return (
    <>
      <SelectionModal
        accentOptions
        visible={!!selectedGroup}
        title={selectedGroup?.title ?? 'Choose source'}
        options={(selectedGroup?.sources ?? []).map((item) => ({
          value: item.id,
          label: getProviderDisplayName(item.providerId),
          detail:
            (item.episodeCount ?? counts[item.id] ?? item.chapterCount) !== undefined
              ? `${item.episodeCount ?? counts[item.id] ?? item.chapterCount} ${item.type === 'anime' ? 'episodes' : 'catalog chapters'}`
              : undefined,
        }))}
        onSelect={(id) => {
          const item = selectedGroup?.sources.find((item) => item.id === id);
          setSelectedGroup(null);
          if (item) onResultPress?.(item);
        }}
        onClose={() => setSelectedGroup(null)}
      />
      <FlatList
        key={columns}
        onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
        data={groups}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-3 px-4 pb-8"
        ListHeaderComponent={
          <Text tone="muted" className="mb-1">
            {groups.length} title{groups.length === 1 ? '' : 's'} for &quot;{query}&quot;
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              width: Math.max(0, (availableWidth - 32 - (columns - 1) * 12) / columns),
              minWidth: 0,
            }}
          >
            <SearchResultItem
              poster
              item={item.sources[0]}
              sourceCount={item.sources.length}
              onPress={() =>
                item.sources.length > 1 ? setSelectedGroup(item) : onResultPress?.(item.sources[0])
              }
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-0" />}
      />
    </>
  );
}
