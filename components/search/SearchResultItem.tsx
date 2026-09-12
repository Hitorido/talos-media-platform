import { Image, Pressable, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import type { SearchResult } from '@/types/search';
import { cn } from '@/utils/cn';
import { comicFormatLabel } from '@/utils/comicFormat';

type SearchResultItemProps = {
  item: SearchResult;
  onPress?: () => void;
  className?: string;
};

export function SearchResultItem({ item, onPress, className }: SearchResultItemProps) {
  const comicLabel =
    item.type === 'manga' ? comicFormatLabel(item.comicFormat ?? 'manga') : undefined;
  const typeLabel =
    item.type === 'anime' ? 'Anime' : item.type === 'novel' ? 'Novel' : (comicLabel ?? 'Manga');
  const badgeVariant =
    item.type === 'anime' ? 'anime' : item.type === 'novel' ? 'novel' : 'manga';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'flex-row gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900',
        className,
      )}
    >
      <View className="overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        <Image source={{ uri: item.coverUrl }} className="h-20 w-14" resizeMode="cover" />
      </View>
      <View className="flex-1 justify-center gap-2">
        <View className="flex-row flex-wrap gap-2">
          <Badge label={typeLabel} variant={badgeVariant} />
          <Badge label={item.subtitle.split('·')[0]?.trim() || item.providerId} variant="secondary" />
        </View>
        <Text variant="label" numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {item.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
