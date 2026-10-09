import { MediaCount } from '@/components/content/MediaCount';
import { PublicationStatus } from '@/components/content/PublicationStatus';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { getProviderDisplayName } from '@/services/contentService';
import { Image, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { useMediaCover } from '@/hooks/useMediaCover';
import type { SearchResult } from '@/types/search';
import { cn } from '@/utils/cn';
import { comicFormatLabel } from '@/utils/comicFormat';

type SearchResultItemProps = {
  item: SearchResult;
  onPress?: () => void;
  className?: string;
  sourceCount?: number;
  poster?: boolean;
};

export function SearchResultItem({
  item,
  onPress,
  className,
  sourceCount = 1,
  poster = false,
}: SearchResultItemProps) {
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
        'gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900',
        poster ? 'flex-col gap-2 p-2' : 'flex-row',
        className,
      )}
    >
      <View
        className={cn(
          'overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800',
          poster ? 'aspect-[2/3] w-full' : 'h-20 w-14',
        )}
      >
        <Image
          source={displayCover?.trim() ? { uri: displayCover } : undefined}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
      <View
        style={poster ? { height: 140, gap: 4 } : undefined}
        className={cn(!poster && 'flex-1 justify-center gap-2')}
      >
        <View className="flex-row items-center gap-1">
          <Badge compact={poster} label={typeLabel} variant={badgeVariant} />
        </View>
        <Text
          variant="label"
          numberOfLines={2}
          style={poster ? { height: 32, fontSize: 12, lineHeight: 16 } : undefined}
        >
          {item.title}
        </Text>
        <PublicationStatus compact={poster} status={item.status} />
        <View className={poster ? 'gap-1' : 'flex-row flex-wrap gap-2'}>
          <Badge
            compact={poster}
            label={
              sourceCount > 1 ? `${sourceCount} sources` : getProviderDisplayName(item.providerId)
            }
            variant="primary"
          />
          <MediaCount
            compact={poster}
            routeId={item.id}
            type={item.type}
            episodeCount={item.episodeCount}
            chapterCount={item.chapterCount}
          />
        </View>
      </View>
    </Pressable>
  );
}
