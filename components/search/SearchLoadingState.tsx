import { View } from 'react-native';

import { SearchResultItem } from '@/components/search/SearchResultItem';
import type { SearchResult } from '@/types/search';

const skeletonItems: SearchResult[] = Array.from({ length: 5 }, (_, index) => ({
  id: `skeleton-${index}`,
  providerId: 'builtin-mock',
  sourceId: `skeleton-${index}`,
  title: 'Loading title',
  coverUrl: 'https://picsum.photos/seed/skeleton/400/600',
  type: 'anime',
  subtitle: 'Loading subtitle',
  tags: [],
}));

export function SearchLoadingState() {
  return (
    <View className="gap-3 px-4 pb-8">
      {skeletonItems.map((item) => (
        <View key={item.id} className="opacity-50">
          <SearchResultItem item={item} />
        </View>
      ))}
    </View>
  );
}
