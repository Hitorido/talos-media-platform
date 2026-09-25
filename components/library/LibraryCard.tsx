import { Image, Pressable, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import type { LibraryEntry, LibraryStatus } from '@/types/library';

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
  title,
  coverUrl,
  subtitle,
  progress,
  onPress,
  onToggleFavorite,
  onChangeStatus,
}: LibraryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row gap-3 border-b border-neutral-200 bg-neutral-50 py-3 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <Image source={coverUrl?.trim() ? { uri: coverUrl } : undefined} className="h-24 w-16 rounded-lg" resizeMode="cover" />
      <View className="flex-1 justify-center gap-1.5">
        <View className="flex-row items-start justify-between gap-2">
          <Text variant="label" numberOfLines={2} className="flex-1">
            {title}
          </Text>
          <Pressable onPress={onToggleFavorite} hitSlop={8}>
            <Text className={entry.isFavorite ? 'text-rose-500' : 'text-neutral-400'}>
              {entry.isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {subtitle}
        </Text>
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
    </Pressable>
  );
}
