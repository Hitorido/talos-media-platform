import { PublicationStatus } from '@/components/content/PublicationStatus';
import { Image, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

import { Badge, Text } from '@/components/ui';
import type { SearchResult } from '@/types/search';
import { getProviderDisplayName } from '@/services/contentService';
import { MediaCount } from '@/components/content/MediaCount';
import { languageLabel } from '@/utils/novelLanguage';
import { cn } from '@/utils/cn';
import { comicFormatLabel } from '@/utils/comicFormat';
import { useMediaCover } from '@/hooks/useMediaCover';

type SearchResultItemProps = {
  item: SearchResult;
  onPress?: () => void;
  className?: string;
};

export function SearchResultItem({ item, onPress, className }: SearchResultItemProps) {
  const displayCover = useMediaCover(item.id, item.coverUrl);
  const comicLabel =
    item.type === 'manga' ? comicFormatLabel(item.comicFormat ?? 'manga') : undefined;
  const typeLabel =
    item.type === 'anime' ? 'Anime' : item.type === 'novel' ? 'Novel' : (comicLabel ?? 'Manga');
  const badgeVariant = item.type === 'anime' ? 'anime' : item.type === 'novel' ? 'novel' : 'manga';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'flex-row gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900',
        className,
      )}
    >
      <View className="h-20 w-14 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        <Image
          source={displayCover?.trim() ? { uri: displayCover } : undefined}
          className="h-20 w-14"
          resizeMode="cover"
        />
      </View>
      <View className="flex-1 justify-center gap-2">
        <View className="flex-row flex-wrap gap-2">
          <Badge label={typeLabel} variant={badgeVariant} />
          {item.type === 'novel' ? (
            <Badge label={languageLabel(item.language)} variant="secondary" />
          ) : null}
          <Badge label={getProviderDisplayName(item.providerId)} variant="primary" />
        </View>
        <Text variant="label" numberOfLines={2}>
          {item.title}
        </Text>
        <PublicationStatus status={item.status} />
        <MediaCount
          routeId={item.id}
          type={item.type}
          episodeCount={item.episodeCount}
          chapterCount={item.chapterCount}
        />
      </View>
    </Pressable>
  );
}
