import { Ionicons } from '@expo/vector-icons';
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
    <View className="gap-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        <Pressable
          onPress={onPress}
          accessibilityLabel={`Open ${title}`}
          className="absolute inset-0"
        >
          <Image
            source={displayCover?.trim() ? { uri: displayCover } : undefined}
            className="h-full w-full"
            resizeMode="cover"
          />
        </Pressable>
        {/* Subtle corner affordance — the cover is a local personalisation. */}
        <CoverCustomizeButton media={media} compact className="absolute right-1 top-1" />
      </View>
      <View style={{ height: 96 }} className="gap-1.5">
        <View className="flex-row items-start justify-between gap-2">
          <Pressable onPress={onPress} className="flex-1">
            <Text
              variant="label"
              numberOfLines={2}
              style={{ height: 32, fontSize: 12, lineHeight: 16 }}
            >
              {title}
            </Text>
          </Pressable>
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            accessibilityLabel={entry.isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Ionicons
              name={entry.isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={entry.isFavorite ? '#f43f5e' : '#9ca3af'}
            />
          </Pressable>
        </View>
        <Pressable onPress={onPress}>
          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={{ fontSize: 10, lineHeight: 16 }}
          >
            {subtitle}
          </Text>
        </Pressable>
        <Pressable onPress={onChangeStatus} className="self-start">
          <Badge
            compact
            label={statusLabels[entry.status]}
            variant={
              entry.status === 'completed'
                ? 'success'
                : entry.status === 'dropped'
                  ? 'anime'
                  : 'primary'
            }
          />
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
