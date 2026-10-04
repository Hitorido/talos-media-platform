import { useMediaCover } from '@/hooks/useMediaCover';
import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Text } from '@/components/ui';
import type { ContinueWatchingItem } from '@/types/content';
import { cn } from '@/utils/cn';

type ContinueWatchingCardProps = {
  item: ContinueWatchingItem;
  onPress?: () => void;
  onContinue?: () => void;
  className?: string;
};

export function ContinueWatchingCard({
  item,
  onPress,
  onContinue,
  className,
}: ContinueWatchingCardProps) {
  const displayCover = useMediaCover(item.id, item.coverUrl);
  return (
    <View className={cn('w-72', className)}>
      <Pressable accessibilityRole="button" onPress={onPress}>
        <View className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
          <Image
            source={displayCover?.trim() ? { uri: displayCover } : undefined}
            className="aspect-video w-full"
            resizeMode="cover"
          />
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
      {onContinue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue from saved position"
          onPress={onContinue}
          className="mt-2 flex-row items-center gap-2 self-start rounded-full bg-primary-600 px-3 py-2"
        >
          <Ionicons name="eye-outline" size={16} color="white" />
          <Text className="text-xs font-semibold text-white">Continue</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
