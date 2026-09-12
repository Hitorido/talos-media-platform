import { Image, Pressable, View } from 'react-native';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Text } from '@/components/ui';
import type { ContinueWatchingItem } from '@/types/content';
import { cn } from '@/utils/cn';

type ContinueWatchingCardProps = {
  item: ContinueWatchingItem;
  onPress?: () => void;
  className?: string;
};

export function ContinueWatchingCard({ item, onPress, className }: ContinueWatchingCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={cn('w-72', className)}>
      <View className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
        <Image source={{ uri: item.coverUrl }} className="aspect-video w-full" resizeMode="cover" />
        <View className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2">
          <ProgressBar progress={item.progress} className="mb-2 bg-white/30" />
          <Text variant="caption" className="text-white">
            Ep {item.episode} / {item.totalEpisodes}
          </Text>
        </View>
      </View>
      <Text variant="label" numberOfLines={1} className="mt-2">
        {item.title}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
        {item.episodeTitle}
      </Text>
    </Pressable>
  );
}
