import { MediaCount } from '@/components/content/MediaCount';
import { Image, Pressable, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import type { ContentType } from '@/types/content';
import { cn } from '@/utils/cn';

type ContentPosterCardProps = {
  routeId?: string;
  episodeCount?: number;
  chapterCount?: number;
  title: string;
  coverUrl: string;
  type: ContentType;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  className?: string;
};

const badgeVariantMap: Record<ContentType, 'anime' | 'manga' | 'novel'> = {
  anime: 'anime',
  manga: 'manga',
  novel: 'novel',
};

const badgeLabelMap: Record<ContentType, string> = {
  anime: 'Anime',
  manga: 'Manga',
  novel: 'Novel',
};

export function ContentPosterCard({
  routeId, episodeCount, chapterCount,
  title,
  coverUrl,
  type,
  subtitle,
  meta,
  onPress,
  className,
}: ContentPosterCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={cn('w-28', className)}>
      <View className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
        {coverUrl ? <Image source={coverUrl?.trim() ? { uri: coverUrl } : undefined} className="aspect-[2/3] w-full" resizeMode="cover" /> : (
          <View className="aspect-[2/3] w-full items-center justify-center px-2"><Text variant="caption" tone="muted">No cover</Text></View>
        )}
        <View className="absolute left-2 top-2">
          <Badge label={badgeLabelMap[type]} variant={badgeVariantMap[type]} />
        </View>
        {meta ? (
          <View className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5">
            <Text variant="caption" className="text-white">
              {meta}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="label" numberOfLines={2} className="mt-2">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
          {subtitle}
        </Text>
      ) : null}
      {routeId ? <MediaCount routeId={routeId} type={type} episodeCount={episodeCount} chapterCount={chapterCount} /> : null}
    </Pressable>
  );
}
