import { useMediaCover } from '@/hooks/useMediaCover';
import { Image, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

import { CoverCustomizeButton } from '@/components/content/CoverCustomizeButton';
import { Badge, Text } from '@/components/ui';
import type { LibraryEntry, LibraryMedia, LibraryStatus } from '@/types/library';

const statusLabels: Record<LibraryStatus, string> = {
  watching: 'Watching',
  reading: 'Reading',
  completed: 'Completed',
  dropped: 'Dropped',
  'plan-to-watch': 'Plan to Watch',
  'plan-to-read': 'Plan to Read',
};

type LibraryCardProps = {
  entry: LibraryEntry;
  /** Local metadata used for the subtle cover-customisation affordance. */
  media: LibraryMedia;
  title: string;
  coverUrl: string;
  subtitle: string;
  progress?: number;
  onPress: () => void;
  onToggleFavorite: () => void;
  onChangeStatus: () => void;
};

export function LibraryCard({
  entry,
  media,
  title,
  coverUrl,
  subtitle,
  progress,
  onPress,
  onToggleFavorite,
  onChangeStatus,
}: LibraryCardProps) {
  const displayCover = useMediaCover(media.id, coverUrl);
  return (
    <View className="flex-row gap-3 border-b border-neutral-200 bg-neutral-50 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <View className="relative h-24 w-16 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        <Image
          source={displayCover?.trim() ? { uri: displayCover } : undefined}
          className="h-full w-full"
          resizeMode="cover"
        />
        {/* Subtle corner affordance — the cover is a local personalisation. */}
        <CoverCustomizeButton media={media} compact className="absolute right-1 top-1" />
      </View>
      <View className="flex-1 justify-center gap-1.5">
        <View className="flex-row items-start justify-between gap-2">
          <Pressable onPress={onPress} className="flex-1">
            <Text variant="label" numberOfLines={2} className="flex-1">
              {title}
            </Text>
          </Pressable>
          <Pressable onPress={onToggleFavorite} hitSlop={8}>
            <Text className={entry.isFavorite ? 'text-rose-500' : 'text-neutral-400'}>
              {entry.isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={onPress}>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </Pressable>
        <Pressable onPress={onChangeStatus} className="self-start">
          <Badge label={statusLabels[entry.status]} variant="secondary" />
        </Pressable>
        {progress !== undefined ? (
          <View className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <View
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
